// client/src/lib/api.ts
import type { ApiError, ApiErrorResponse } from "@fluxion/shared";

// client/src/lib/api.ts
export class ApiFetchError extends Error {
  readonly apiError: ApiError;
  constructor(apiError: ApiError) {
    super(apiError.message);
    this.name = "ApiFetchError";
    this.apiError = apiError;
  }
}

const INTERNAL: ApiError = {
  type: "internal",
  code: "INTERNAL_ERROR",
  message: "Something went wrong. Please try again.",
};

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      ...init,                                  // spread FIRST…
      credentials: "include",                   // …so these two always win
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiFetchError(INTERNAL);          // network reject: no Response at all
  }

  if (res.ok) {
    if (res.status === 204) return undefined as T; // logout has no body
    try {
      return (await res.json()) as T;            // ← cast, not proof (your decision 2)
    } catch {
      throw new ApiFetchError(INTERNAL);
    }
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new ApiFetchError(INTERNAL);           // e.g. proxy 502 HTML
  }
  if (isApiErrorResponse(body)) throw new ApiFetchError(body.error);
  throw new ApiFetchError(INTERNAL);             // non-2xx that isn't our envelope
}

function isApiErrorResponse(b: unknown): b is ApiErrorResponse {
  return (
    typeof b === "object" && b !== null && "error" in b &&
    typeof (b as { error: unknown }).error === "object" &&
    (b as { error: unknown }).error !== null &&
    "type" in (b as { error: object }).error
  );
}