import { z } from "zod";
import {
  httpConfigSchema,
  delayConfigSchema,
  conditionConfigSchema,
  transformConfigSchema,
  type HttpConfig,
} from "@fluxion/shared";
import type { FluxionNode, FluxionNodeData } from "../lib/toReactFlow";

// Client "can execute?" hint. Runs the STRICT schema; returns the first message for a
// field, or undefined. Never blocks Save — it only renders muted text under the input.
function hintFor(schema: z.ZodType, value: unknown, path: string): string | undefined {
  const r = schema.safeParse(value);
  return r.success ? undefined : r.error.issues.find((i) => i.path[0] === path)?.message;
}

export function ConfigPanel({ selectedNodes, onChange }: {
  selectedNodes: FluxionNode[];
  onChange: (id: string, next: FluxionNodeData) => void;
}) {
  if (selectedNodes.length === 0)
    return <aside className="config-panel">Select a node to configure it.</aside>;
  if (selectedNodes.length > 1)
    return <aside className="config-panel">Multiple nodes selected.</aside>;

  const node = selectedNodes[0];
  switch (node.data.type) {
    case "http":      return <HttpForm      id={node.id} data={node.data} onChange={onChange} />;
    case "delay":     return <DelayForm     id={node.id} data={node.data} onChange={onChange} />;
    case "condition": return <ConditionForm id={node.id} data={node.data} onChange={onChange} />;
    case "transform": return <TransformForm id={node.id} data={node.data} onChange={onChange} />;
    case "trigger":   return <aside className="config-panel">Trigger has no configuration.</aside>;
  }
}

type FormProps<T extends FluxionNodeData["type"]> = {
  id: string;
  data: Extract<FluxionNodeData, { type: T }>;
  onChange: (id: string, next: FluxionNodeData) => void;
};

function HttpForm({ id, data, onChange }: FormProps<"http">) {
  const config = data.config; // Partial<HttpConfig>, narrowed
  const write = (next: typeof config) => onChange(id, { ...data, config: next }); // no cast

  return (
    <aside className="config-panel">
      <label>Method
        <select value={config.method ?? ""} onChange={(e) => {
          const v = e.target.value; const next = { ...config };
          if (v === "") delete next.method; else next.method = v as HttpConfig["method"];
          write(next);
        }}>
          <option value="">—</option>
          {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => <option key={m}>{m}</option>)}
        </select>
      </label>
      <label>URL
        <input value={config.url ?? ""} onChange={(e) => {
          const v = e.target.value; const next = { ...config };
          if (v === "") delete next.url; else next.url = v; // blank => DELETE the key, not ""
          write(next);
        }} />
      </label>
      {hintFor(httpConfigSchema, config, "url") && (
        <small className="hint">{hintFor(httpConfigSchema, config, "url")}</small>
      )}
    </aside>
  );
}

function DelayForm({ id, data, onChange }: FormProps<"delay">) {
  const config = data.config;
  const write = (next: typeof config) => onChange(id, { ...data, config: next });

  return (
    <aside className="config-panel">
      <label>Delay (ms)
        <input type="number" value={config.ms ?? ""} onChange={(e) => {
          const v = e.target.value; const next = { ...config };
          if (v === "") delete next.ms; else next.ms = Number(v);
          write(next);
        }} />
      </label>
      {hintFor(delayConfigSchema, config, "ms") && (
        <small className="hint">{hintFor(delayConfigSchema, config, "ms")}</small>
      )}
    </aside>
  );
}

function ConditionForm({ id, data, onChange }: FormProps<"condition">) {
  const config = data.config;
  const write = (next: typeof config) => onChange(id, { ...data, config: next });

  return (
    <aside className="config-panel">
      <label>Expression
        <input value={config.expression ?? ""} onChange={(e) => {
          const v = e.target.value; const next = { ...config };
          if (v === "") delete next.expression; else next.expression = v;
          write(next);
        }} />
      </label>
      {hintFor(conditionConfigSchema, config, "expression") && (
        <small className="hint">{hintFor(conditionConfigSchema, config, "expression")}</small>
      )}
    </aside>
  );
}

function TransformForm({ id, data, onChange }: FormProps<"transform">) {
  const config = data.config;
  const write = (next: typeof config) => onChange(id, { ...data, config: next });

  return (
    <aside className="config-panel">
      <label>Mapping
        <input value={config.mapping ?? ""} onChange={(e) => {
          const v = e.target.value; const next = { ...config };
          if (v === "") delete next.mapping; else next.mapping = v;
          write(next);
        }} />
      </label>
      {hintFor(transformConfigSchema, config, "mapping") && (
        <small className="hint">{hintFor(transformConfigSchema, config, "mapping")}</small>
      )}
    </aside>
  );
}