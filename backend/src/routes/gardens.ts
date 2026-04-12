import { Router } from "express";
import { getDb } from "../db.js";
import { z } from "zod";

const router = Router();

const GardenSchema = z.object({
  id: z.string(),
  name: z.string(),
  beds: z.array(z.any()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

router.get("/", (_req, res) => {
  const db = getDb();
  const rows = db.prepare("SELECT id, name, data FROM gardens ORDER BY created_at DESC").all() as Array<{
    id: string;
    name: string;
    data: string;
  }>;
  const gardens = rows.map((r) => ({ ...JSON.parse(r.data), id: r.id, name: r.name }));
  res.json(gardens);
});

router.post("/", (req, res) => {
  const result = GardenSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.message });
    return;
  }
  const garden = result.data;
  const db = getDb();
  db.prepare("INSERT OR REPLACE INTO gardens (id, name, data, updated_at) VALUES (?, ?, ?, datetime('now'))").run(
    garden.id,
    garden.name,
    JSON.stringify(garden)
  );
  res.status(201).json(garden);
});

router.delete("/:id", (req, res) => {
  const db = getDb();
  db.prepare("DELETE FROM gardens WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

export default router;
