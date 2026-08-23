import type { RequestHandler } from "express";

/**
 * Optional shared-token auth.
 *
 * Without GARDENER_TOKEN the API stays open — that is the intended setup for a
 * container on a trusted home network. Set the variable as soon as the backend
 * is reachable from anywhere else: every /api route except /api/health then
 * requires `Authorization: Bearer <token>`.
 */
export function createAuth(token: string | undefined): RequestHandler {
  if (!token) {
    console.warn(
      "[gardener] GARDENER_TOKEN is not set — the API accepts unauthenticated requests. " +
        "Set it whenever the backend is reachable beyond a trusted network.",
    );
    return (_req, _res, next) => next();
  }

  const expected = `Bearer ${token}`;
  return (req, res, next) => {
    if (req.path === "/health") return next();
    if (req.get("authorization") === expected) return next();
    res.status(401).json({ error: "Unauthorized" });
  };
}
