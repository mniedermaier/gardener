import type { ErrorRequestHandler, RequestHandler } from "express";

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: "Not found" });
};

/**
 * Keeps internals server-side. Express' default handler renders the stack trace
 * into the response body, which leaks absolute paths to every client.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const isConstraintViolation =
    err instanceof Error && err.name === "SqliteError" && /constraint failed/i.test(err.message);

  if (isConstraintViolation) {
    console.warn("[gardener] rejected request:", err.message);
    res.status(400).json({ error: "Request conflicts with existing data" });
    return;
  }

  console.error("[gardener] unhandled error:", err);
  res.status(500).json({ error: "Internal error" });
};
