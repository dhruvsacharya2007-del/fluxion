

import type { CookieOptions, Response } from "express";
import { IS_PROD, COOKIE_NAME } from "../config";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const baseOptions: CookieOptions = {
  httpOnly: true,
  path: "/",
  sameSite: IS_PROD ? "none" : "lax",
  secure: IS_PROD, 
};

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, { ...baseOptions, maxAge: SEVEN_DAYS_MS });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, baseOptions); 
}