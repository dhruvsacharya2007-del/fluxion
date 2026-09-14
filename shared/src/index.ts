import { z } from "zod";

// ---- Health (Day 1) ----
export const healthResponseSchema = z.object({ status: z.literal("ok") });
export type HealthResponse = z.infer<typeof healthResponseSchema>;

// ---- Request contracts ----
export const registerSchema = z.object({
  email: z.email({ error: "Invalid email address" }),
  password: z
    .string()
    .min(8, { error: "Password must be at least 8 characters" })
    .max(72, { error: "Password must be at most 72 characters" }),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.email({ error: "Invalid email address" }),
  password: z.string().min(1, { error: "Password is required" }),
});

export type LoginInput = z.infer<typeof loginSchema>;

// user shape returned by register / login / me
export interface AuthUser {
  id: string;
  email: string;
}

// ---- API error contract ----
export interface ValidationApiError {
  type: "validation";
  code: "VALIDATION_ERROR";
  message: string;
  fieldErrors: Record<string, string[]>;
  formErrors: string[];
}
export interface BadRequestApiError {
  type: "bad_request";
  code: "MALFORMED_JSON";
  message: string;
}
export interface ConflictApiError {
  type: "conflict";
  code: "EMAIL_ALREADY_REGISTERED";
  message: string;
}
export interface UnauthorizedApiError {
  type: "unauthorized";
  code: "INVALID_CREDENTIALS" | "UNAUTHENTICATED";
  message: string;
}
export interface InternalApiError {
  type: "internal";
  code: "INTERNAL_ERROR";
  message: string;
}
export type ApiError =
  | ValidationApiError
  | BadRequestApiError
  | ConflictApiError
  | UnauthorizedApiError
  | InternalApiError;
export interface ApiErrorResponse {
  error: ApiError;
}