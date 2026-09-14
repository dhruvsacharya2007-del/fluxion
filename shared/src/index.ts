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

export const createWorkflowSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120, "Name too long"),
});
export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;

// ── List item / create response: metadata only, no graph.
export type WorkflowListItem = {
  id: string;
  name: string;
  createdAt: string;   // JSON has no Date — these are ISO strings over the wire
  updatedAt: string;
};
export type WorkflowListResponse = { workflows: WorkflowListItem[] };

// ── Create returns the same shape as a list item (aliased, per your rule).
export type CreateWorkflowResponse = { workflow: WorkflowListItem };

// ── Detail: metadata + graph.
export type WorkflowNode = {
  id: string;
  type: "trigger" | "http" | "delay" | "condition" | "transform";
  config: unknown;      // Json column — shape is per-node-type, refined Day 9
  positionX: number;
  positionY: number;
};
export type WorkflowEdge = {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  branchLabel: string | null;
};
export type WorkflowDetail = WorkflowListItem & {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};

export type WorkflowDetailResponse = { workflow: WorkflowDetail };

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
export type NotFoundApiError = { type: "not_found"; code: "NOT_FOUND"; message: string };

export type ApiError =
  | ValidationApiError
  | BadRequestApiError
  | ConflictApiError
  | UnauthorizedApiError
  | NotFoundApiError
  | InternalApiError;

export interface ApiErrorResponse {
  error: ApiError;
}