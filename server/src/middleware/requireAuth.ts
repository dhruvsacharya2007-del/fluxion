import type { RequestHandler } from "express";
import { COOKIE_NAME } from "../config";
import { verifyToken } from "../auth/jwt";
import { UnauthorizedError } from "../errors";

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    return next(new UnauthorizedError("UNAUTHENTICATED", "Authentication required"));
  }
  try {
    req.userId = await verifyToken(token); // sets the augmented field
    next();
  } catch {
    // any verify failure — bad signature, expired, missing sub — is one thing to the client
    next(new UnauthorizedError("UNAUTHENTICATED", "Invalid or expired session"));
  }
};