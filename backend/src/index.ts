import express from "express";
import cors from "cors";
import gardensRouter from "./routes/gardens.js";
import tasksRouter from "./routes/tasks.js";
import syncRouter from "./routes/sync.js";

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/gardens", gardensRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/sync", syncRouter);

app.listen(PORT, () => {
  console.log(`Gardener backend listening on port ${PORT}`);
});
