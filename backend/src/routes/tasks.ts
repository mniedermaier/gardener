import { Router } from "express";
import { getDb } from "../db.js";
import { z } from "zod";

const router = Router();

const TaskSchema = z.object({
  id: z.string(),
  gardenId: z.string(),
  plantId: z.string().optional(),
  bedId: z.string().optional(),
  type: z.string(),
  title: z.string(),
  description: z.string().optional(),
  dueDate: z.string(),
  completedDate: z.string().optional().nullable(),
});

router.get("/", (_req, res) => {
  const db = getDb();
  const rows = db.prepare("SELECT id, data FROM tasks ORDER BY created_at DESC").all() as Array<{
    id: string;
    data: string;
  }>;
  const tasks = rows.map((r) => ({ ...JSON.parse(r.data), id: r.id }));
  res.json(tasks);
});

router.post("/", (req, res) => {
  const result = TaskSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.message });
    return;
  }
  const task = result.data;
  const db = getDb();
  db.prepare("INSERT OR REPLACE INTO tasks (id, garden_id, data) VALUES (?, ?, ?)").run(
    task.id,
    task.gardenId,
    JSON.stringify(task)
  );
  res.status(201).json(task);
});

router.patch("/:id", (req, res) => {
  const db = getDb();
  const existing = db.prepare("SELECT data FROM tasks WHERE id = ?").get(req.params.id) as { data: string } | undefined;
  if (!existing) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  const merged = { ...JSON.parse(existing.data), ...req.body };
  db.prepare("UPDATE tasks SET data = ? WHERE id = ?").run(JSON.stringify(merged), req.params.id);
  res.json(merged);
});

router.delete("/:id", (req, res) => {
  const db = getDb();
  db.prepare("DELETE FROM tasks WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

export default router;
