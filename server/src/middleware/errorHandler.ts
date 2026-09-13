import type { ErrorRequestHandler } from "express";
import type { ApiErrorResponse } from "@fluxion/shared";
import { AppError } from "../errors";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // 1. Our own typed errors carry their own shape + status.
  if (err instanceof AppError) {
    const body: ApiErrorResponse = { error: err.toApiError() };
    return res.status(err.status).json(body);
  }

  // 2. Malformed JSON — express.json() throws BEFORE any route runs.
  //    body-parser tags it as entity.parse.failed.
  if (err instanceof SyntaxError && (err as { type?: string }).type === "entity.parse.failed") {
    const body: ApiErrorResponse = {
      error: { type: "bad_request", code: "MALFORMED_JSON", message: "Request body contains invalid JSON" },
    };
    return res.status(400).json(body);
  }

  // 3. Anything unrecognized: log the real error, return an opaque 500.
  console.error("[unhandled]", err);
  const body: ApiErrorResponse = {
    error: { type: "internal", code: "INTERNAL_ERROR", message: "Something went wrong" },
  };
  return res.status(500).json(body);
};