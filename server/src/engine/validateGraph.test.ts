import { describe, it, expect } from "vitest";
import type { WorkflowNode, WorkflowEdge, NodeType } from "@fluxion/shared";
import { validateGraph } from "./validateGraph.js";

const node = (id: string, type: NodeType, config: unknown = {}): WorkflowNode =>
  ({ id, type, config, positionX: 0, positionY: 0 });
const edge = (id: string, s: string, t: string): WorkflowEdge =>
  ({ id, sourceNodeId: s, targetNodeId: t, branchLabel: null });

const httpCfg = { method: "GET", url: "https://example.com" };

describe("validateGraph", () => {
  it("accepts a valid DAG and returns a topological order", () => {
    const nodes = [node("t", "trigger"), node("h", "http", httpCfg), node("d", "delay", { ms: 100 })];
    const edges = [edge("e1", "t", "h"), edge("e2", "h", "d")];
    const res = validateGraph(nodes, edges);
    expect(res.ok).toBe(true);
    if (res.ok) {
      const pos = (id: string) => res.order.indexOf(id);
      expect(pos("t")).toBeLessThan(pos("h"));   // assert CONSTRAINTS, not exact order —
      expect(pos("h")).toBeLessThan(pos("d"));   // topological order isn't unique
    }
  });

  it("reports the exact cycle path", () => {
    const nodes = [node("t", "trigger"), node("a", "delay", { ms: 1 }), node("b", "delay", { ms: 1 })];
    const edges = [edge("e1", "t", "a"), edge("e2", "a", "b"), edge("e3", "b", "a")];
    const res = validateGraph(nodes, edges);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      const cycle = res.problems.find((p) => p.kind === "cycle");
      expect(cycle).toBeDefined();
      if (cycle?.kind === "cycle") expect(new Set(cycle.nodeIds)).toEqual(new Set(["a", "b"]));
    }
  });

  it("catches a self-loop as a cycle", () => {
    const nodes = [node("t", "trigger"), node("a", "delay", { ms: 1 })];
    const edges = [edge("e1", "t", "a"), edge("e2", "a", "a")];
    const res = validateGraph(nodes, edges);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.problems.some((p) => p.kind === "cycle")).toBe(true);
  });

  it("requires exactly one trigger", () => {
    const none = validateGraph([node("h", "http", httpCfg)], []);
    expect(none.ok).toBe(false);
    if (!none.ok) expect(none.problems.some((p) => p.kind === "no_trigger")).toBe(true);

    const many = validateGraph([node("t1", "trigger"), node("t2", "trigger")], []);
    expect(many.ok).toBe(false);
    if (!many.ok) {
      const p = many.problems.find((x) => x.kind === "multiple_triggers");
      if (p?.kind === "multiple_triggers") expect(new Set(p.nodeIds)).toEqual(new Set(["t1", "t2"]));
    }
  });

  it("rejects a trigger with an incoming edge", () => {
    const nodes = [node("t", "trigger"), node("a", "delay", { ms: 1 })];
    const edges = [edge("e1", "t", "a"), edge("e2", "a", "t")]; // also a cycle; both reported
    const res = validateGraph(nodes, edges);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.problems.some((p) => p.kind === "trigger_has_incoming")).toBe(true);
  });

  it("flags nodes unreachable from the trigger", () => {
    const nodes = [node("t", "trigger"), node("a", "delay", { ms: 1 }), node("island", "delay", { ms: 1 })];
    const edges = [edge("e1", "t", "a")]; // island has no path from t
    const res = validateGraph(nodes, edges);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      const un = res.problems.filter((p) => p.kind === "unreachable").map((p) => p.kind === "unreachable" && p.nodeId);
      expect(un).toContain("island");
    }
  });

  it("validates config with the STRICT schema and normalizes issues", () => {
    const nodes = [node("t", "trigger"), node("h", "http", { method: "GET" })]; // url missing
    const edges = [edge("e1", "t", "h")];
    const res = validateGraph(nodes, edges);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      const cfg = res.problems.find((p) => p.kind === "invalid_config");
      if (cfg?.kind === "invalid_config") {
        expect(cfg.nodeId).toBe("h");
        expect(cfg.issues.some((i) => i.path === "url")).toBe(true);
      }
    }
  });

  it("COLLECTS ALL problems, not just the first", () => {
    // bad config AND an unreachable island, in one graph
    const nodes = [node("t", "trigger"), node("h", "http", { method: "GET" }), node("island", "delay", { ms: 1 })];
    const edges = [edge("e1", "t", "h")];
    const res = validateGraph(nodes, edges);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      const kinds = new Set(res.problems.map((p) => p.kind));
      expect(kinds.has("invalid_config")).toBe(true);
      expect(kinds.has("unreachable")).toBe(true);
    }
  });
});