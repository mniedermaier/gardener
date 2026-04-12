import { Router } from "express";
import { getDb } from "../db.js";

const router = Router();

router.get("/", (_req, res) => {
  const db = getDb();
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
});

router.post("/", (req, res) => {
  const { gardens = [], tasks = [] } = req.body;
  const db = getDb();

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

  res.json({ synced: { gardens: gardens.length, tasks: tasks.length } });
});

export default router;
