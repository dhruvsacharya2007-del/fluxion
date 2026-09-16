import type { Node, Edge } from "@xyflow/react";
import type {
  WorkflowDetail,
  GraphNodeInput,
  SaveGraphRequest,
  HttpConfig,
  DelayConfig,
  ConditionConfig,
  TransformConfig,
  TriggerConfig,
} from "@fluxion/shared";

export type FluxionNodeData =
  | { type: "http";      label: string; config: Partial<HttpConfig> }
  | { type: "delay";     label: string; config: Partial<DelayConfig> }
  | { type: "condition"; label: string; config: Partial<ConditionConfig> }
  | { type: "transform"; label: string; config: Partial<TransformConfig> }
  | { type: "trigger";   label: string; config: TriggerConfig };   

export type FluxionNode = Node<FluxionNodeData>;


function toNodeData(n: WorkflowDetail["nodes"][number]): FluxionNodeData {
  switch (n.type) {
    case "http":      return { type: "http",      label: n.type, config: (n.config ?? {}) as Partial<HttpConfig> };
    case "delay":     return { type: "delay",     label: n.type, config: (n.config ?? {}) as Partial<DelayConfig> };
    case "condition": return { type: "condition", label: n.type, config: (n.config ?? {}) as Partial<ConditionConfig> };
    case "transform": return { type: "transform", label: n.type, config: (n.config ?? {}) as Partial<TransformConfig> };
    case "trigger":   return { type: "trigger",   label: n.type, config: (n.config ?? {}) as TriggerConfig };
  }
}

export function toReactFlow(detail: WorkflowDetail): {
  nodes: FluxionNode[];
  edges: Edge[];
} {
  const nodes: FluxionNode[] = detail.nodes.map((n) => ({
    id: n.id,
    position: { x: n.positionX, y: n.positionY },
    data: toNodeData(n),
  }));

  const edges: Edge[] = detail.edges.map((e) => ({
    id: e.id,
    source: e.sourceNodeId,
    target: e.targetNodeId,
  }));

  return { nodes, edges };
}

// RF node -> a SPECIFIC GraphNodeInput member. Switching on n.data.type inside the
// helper keeps the type<->config correlation that a flat .map would lose (n.data is
// narrowed per branch, so no cast needed).
function fromNodeData(n: FluxionNode): GraphNodeInput {
  const base = { id: n.id, positionX: n.position.x, positionY: n.position.y };
  switch (n.data.type) {
    case "http":      return { ...base, type: "http",      config: n.data.config };
    case "delay":     return { ...base, type: "delay",     config: n.data.config };
    case "condition": return { ...base, type: "condition", config: n.data.config };
    case "transform": return { ...base, type: "transform", config: n.data.config };
    case "trigger":   return { ...base, type: "trigger",   config: n.data.config };
  }
}

export function fromReactFlow(nodes: FluxionNode[], edges: Edge[]): SaveGraphRequest {
  return {
    nodes: nodes.map(fromNodeData),
    edges: edges.map((e) => ({
      id: e.id,
      sourceNodeId: e.source,
      targetNodeId: e.target,
    })),
  };
}