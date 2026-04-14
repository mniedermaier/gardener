import { Router } from "express";
import { getDb } from "../db.js";

const router = Router();

// GET /api/sync — return the full state snapshot
router.get("/", (_req, res) => {
  const db = getDb();
  const row = db.prepare("SELECT data FROM state_snapshot WHERE id = 1").get() as
    | { data: string }
    | undefined;

  if (row) {
    res.json(JSON.parse(row.data));
  } else {
    // Fallback: return legacy gardens/tasks data for backward compat
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
    });
  }
});

// POST /api/sync — store the full state snapshot
router.post("/", (req, res) => {
  const db = getDb();
  const data = JSON.stringify(req.body);

  db.prepare(
    "INSERT OR REPLACE INTO state_snapshot (id, data, updated_at) VALUES (1, ?, datetime('now'))"
  ).run(data);

  // Also keep gardens/tasks tables in sync for backward compat
  const { gardens = [], tasks = [] } = req.body;

  const insertGarden = db.prepare(
    "INSERT OR REPLACE INTO gardens (id, name, data, updated_at) VALUES (?, ?, ?, datetime('now'))"
  );
  const insertTask = db.prepare(
    "INSERT OR REPLACE INTO tasks (id, garden_id, data) VALUES (?, ?, ?)"
  );

  const tx = db.transaction(() => {
    for (const g of gardens) {
      insertGarden.run(g.id, g.name, JSON.stringify(g));
    }
    for (const t of tasks) {
      insertTask.run(t.id, t.gardenId || "", JSON.stringify(t));
    }
  });
  tx();

  res.json({ synced: true });
});

export default router;
