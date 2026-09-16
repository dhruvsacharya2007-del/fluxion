import { z } from "zod";

// ---------- health ----------
export const healthResponseSchema = z.object({ status: z.literal("ok") });
export type HealthResponse = z.infer<typeof healthResponseSchema>;

// ---------- auth ----------
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

export interface AuthUser {
  id: string;
  email: string;
}

// ---------- workflows: create ----------
export const createWorkflowSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120, "Name too long"),
});
export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;

export type WorkflowListItem = {
  id: string;
  name: string;
  createdAt: string; // ISO string over the wire
  updatedAt: string;
};
export type WorkflowListResponse = { workflows: WorkflowListItem[] };
export type CreateWorkflowResponse = { workflow: WorkflowListItem };

// ---------- node type (single source of truth) ----------
export const nodeTypeSchema = z.enum([
  "trigger",
  "http",
  "delay",
  "condition",
  "transform",
]);
export type NodeType = z.infer<typeof nodeTypeSchema>;

// ---------- workflow detail (response shapes) ----------
export type WorkflowNode = {
  id: string;
  type: NodeType;
  config: unknown;
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




export const httpConfigSchema = z.strictObject({
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  url: z.url(),                       // v4 top-level; z.string().url() is deprecated
});
export const delayConfigSchema = z.strictObject({
  ms: z.int().positive(),            // v4: z.int() rejects non-integers up front
});
export const conditionConfigSchema = z.strictObject({
  expression: z.string().min(1),     // z.string() alone accepts "" — .min(1) is deliberate
});
export const transformConfigSchema = z.strictObject({
  mapping: z.string().min(1),
});
export const triggerConfigSchema = z.strictObject({}); // nothing to configure

export type HttpConfig = z.infer<typeof httpConfigSchema>;
export type DelayConfig = z.infer<typeof delayConfigSchema>;
export type ConditionConfig = z.infer<typeof conditionConfigSchema>;
export type TransformConfig = z.infer<typeof transformConfigSchema>;
export type TriggerConfig = z.infer<typeof triggerConfigSchema>;

// Base fields every graph node carries. Spread into each union member (DRY).
// ---- Day 10: run-time validation contract ----
export const strictConfigSchemas: Record<NodeType, z.ZodType> = {
  trigger: triggerConfigSchema,
  http: httpConfigSchema,
  delay: delayConfigSchema,
  condition: conditionConfigSchema,
  transform: transformConfigSchema,
};

export interface ConfigIssue {
  path: string;    // Zod issue path joined with "." ("" = whole config object)
  message: string;
}
export type GraphProblem =
  | { kind: "no_trigger" }
  | { kind: "multiple_triggers"; nodeIds: string[] }
  | { kind: "trigger_has_incoming"; nodeId: string }
  | { kind: "cycle"; nodeIds: string[] }            // exact cycle path
  | { kind: "unreachable"; nodeId: string }
  | { kind: "invalid_config"; nodeId: string; issues: ConfigIssue[] };

export type GraphValidationResult =
  | { ok: true; order: string[] }                    // topological order (node ids)
  | { ok: false; problems: GraphProblem[] };

const graphNodeBase = {
  id: z.string().min(1),
  positionX: z.number(),
  positionY: z.number(),
};

// SAVE = "structurally coherent draft": right shape for the type, fields may be absent.
// .partial() relaxes PRESENCE; strictObject still rejects foreign keys. Blank == absent.
export const graphNodeSchema = z.discriminatedUnion("type", [
  z.object({ ...graphNodeBase, type: z.literal("http"),      config: httpConfigSchema.partial() }),
  z.object({ ...graphNodeBase, type: z.literal("delay"),     config: delayConfigSchema.partial() }),
  z.object({ ...graphNodeBase, type: z.literal("condition"), config: conditionConfigSchema.partial() }),
  z.object({ ...graphNodeBase, type: z.literal("transform"), config: transformConfigSchema.partial() }),
  z.object({ ...graphNodeBase, type: z.literal("trigger"),   config: triggerConfigSchema.partial() }),
]);


export const graphEdgeSchema = z.object({
  id: z.string().min(1),
  sourceNodeId: z.string().min(1),
  targetNodeId: z.string().min(1),
  branchLabel: z.string().nullable().optional(), // no branching UI until Day 13; client omits it
});
export const saveGraphSchema = z.object({
  nodes: z.array(graphNodeSchema),
  edges: z.array(graphEdgeSchema),
});
export type GraphNodeInput = z.infer<typeof graphNodeSchema>;
export type GraphEdgeInput = z.infer<typeof graphEdgeSchema>;
export type SaveGraphRequest = z.infer<typeof saveGraphSchema>;
// Response reuses WorkflowDetailResponse — the saved graph, same shape as GET /:id.

// ---------- errors ----------
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
export type NotFoundApiError = {
  type: "not_found";
  code: "NOT_FOUND";
  message: string;
};

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