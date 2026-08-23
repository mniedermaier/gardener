import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import gardensRouter from "./routes/gardens.js";
import tasksRouter from "./routes/tasks.js";
import syncRouter from "./routes/sync.js";
import { createAuth } from "./middleware/auth.js";
import { errorHandler, notFound } from "./middleware/errors.js";

const app = express();
const PORT = Number(process.env.PORT) || 3001;

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") ?? ["http://localhost:5173", "http://localhost:4173", "http://localhost:8080"];
app.use(cors({
  origin: allowedOrigins,
}));
app.use(express.json({ limit: "5mb" }));

// Rate limiting: 100 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
app.use("/api/", limiter);
app.use("/api/", createAuth(process.env.GARDENER_TOKEN));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/gardens", gardensRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/sync", syncRouter);

app.use("/api/", notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Gardener backend listening on port ${PORT}`);
});
