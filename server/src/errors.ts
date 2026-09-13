import type { ApiError } from "@fluxion/shared";

export abstract class AppError extends Error {
  abstract readonly status: number;
  abstract toApiError(): ApiError;
}

export class ValidationError extends AppError {
  readonly status = 422;
  constructor(
    private readonly fieldErrors: Record<string, string[]>,
    private readonly formErrors: string[],
  ) {
    super("Request validation failed");
    this.name = "ValidationError";
  }
  toApiError(): ApiError {
    return {
      type: "validation",
      code: "VALIDATION_ERROR",
      message: this.message,
      fieldErrors: this.fieldErrors,
      formErrors: this.formErrors,
    };
  }
}

export class ConflictError extends AppError {
  readonly status = 409;
  constructor(
    private readonly code: "EMAIL_ALREADY_REGISTERED",
    message: string,
  ) {
    super(message);
    this.name = "ConflictError";
  }
  toApiError(): ApiError {
    return { type: "conflict", code: this.code, message: this.message };
  }
}

export class UnauthorizedError extends AppError {
  readonly status = 401;
  constructor(
    private readonly code: "INVALID_CREDENTIALS" | "UNAUTHENTICATED",
    message: string,
  ) {
    super(message);
    this.name = "UnauthorizedError";
  }
  toApiError(): ApiError {
    return { type: "unauthorized", code: this.code, message: this.message };
  }
}