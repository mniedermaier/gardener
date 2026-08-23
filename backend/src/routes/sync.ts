import { Router } from "express";
import { z } from "zod";
import { getDb } from "../db.js";

const router = Router();

/**
 * The snapshot carries every collection the app owns. Only the fields the
 * backend itself touches are described precisely — the rest is stored verbatim,
 * because the frontend is the single source of truth for their shape.
 */
const SyncPayloadSchema = z
  .object({
    gardens: z
      .array(z.object({ id: z.string().min(1), name: z.string() }).loose())
      .default([]),
    tasks: z
      .array(z.object({ id: z.string().min(1), gardenId: z.string().optional() }).loose())
      .default([]),
  })
  .loose();

// GET /api/sync — full state snapshot plus the time it was stored
router.get("/", (_req, res) => {
  const db = getDb();
  const row = db
    .prepare("SELECT data, updated_at FROM state_snapshot WHERE id = 1")
    .get() as { data: string; updated_at: string } | undefined;

  if (row) {
    res.json({ ...JSON.parse(row.data), savedAt: row.updated_at });
    return;
  }

  // Fallback: legacy gardens/tasks data for backward compat
  const gardens = db.prepare("SELECT id, name, data FROM gardens").all() as Array<{
    id: string;
    name: string;
    data: string;
  }>;
  const tasks = db.prepare("SELECT id, data FROM tasks").all() as Array<{
    id: string;
    data: string;
  }>;

  res.json({
    gardens: gardens.map((r) => JSON.parse(r.data)),
    tasks: tasks.map((r) => JSON.parse(r.data)),
    savedAt: null,
  });
});

// POST /api/sync — store the full state snapshot
router.post("/", (req, res) => {
  const result = SyncPayloadSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.message });
    return;
  }
  const payload = result.data;

  const db = getDb();
  const savedAt = new Date().toISOString();

  const insertSnapshot = db.prepare(
    "INSERT OR REPLACE INTO state_snapshot (id, data, updated_at) VALUES (1, ?, ?)",
  );
  const insertGarden = db.prepare(
    "INSERT OR REPLACE INTO gardens (id, name, data, updated_at) VALUES (?, ?, ?, ?)",
  );
  const insertTask = db.prepare(
    "INSERT OR REPLACE INTO tasks (id, garden_id, data) VALUES (?, ?, ?)",
  );
  const deleteMissingGardens = db.prepare("DELETE FROM gardens WHERE id NOT IN (SELECT value FROM json_each(?))");
  const deleteMissingTasks = db.prepare("DELETE FROM tasks WHERE id NOT IN (SELECT value FROM json_each(?))");

  const gardenIds = payload.gardens.map((g) => g.id);
  // A task may only reference a garden present in the same snapshot, otherwise
  // the foreign key rejects it and the whole sync fails.
  const syncableTasks = payload.tasks.filter((t) => t.gardenId && gardenIds.includes(t.gardenId));

  const tx = db.transaction(() => {
    insertSnapshot.run(JSON.stringify({ ...payload, savedAt }), savedAt);

    for (const g of payload.gardens) {
      insertGarden.run(g.id, g.name, JSON.stringify(g), savedAt);
    }
    for (const t of syncableTasks) {
      insertTask.run(t.id, t.gardenId, JSON.stringify(t));
    }

    // The snapshot is authoritative: whatever it no longer contains was deleted.
    deleteMissingTasks.run(JSON.stringify(syncableTasks.map((t) => t.id)));
    deleteMissingGardens.run(JSON.stringify(gardenIds));
  });
  tx();

  res.json({ synced: true, savedAt, skippedTasks: payload.tasks.length - syncableTasks.length });
});

export default router;
