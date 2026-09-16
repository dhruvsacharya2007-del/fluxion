import {
  strictConfigSchemas,
  type WorkflowNode,
  type WorkflowEdge,
  type GraphProblem,
  type GraphValidationResult,
  type ConfigIssue,
} from "@fluxion/shared";

// Pure. No Prisma, no HTTP. POST /run (Day 11) loads nodes+edges and calls this.
export function validateGraph(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): GraphValidationResult {
  const problems: GraphProblem[] = [];

  // adjacency (source -> targets) + in-degree. Built once, reused by every pass.
  const adjacency = new Map<string, string[]>();
  const indegree = new Map<string, number>();
  for (const n of nodes) { adjacency.set(n.id, []); indegree.set(n.id, 0); }
  for (const e of edges) {
    adjacency.get(e.sourceNodeId)?.push(e.targetNodeId);
    indegree.set(e.targetNodeId, (indegree.get(e.targetNodeId) ?? 0) + 1);
  }

  // --- structure: exactly one trigger ---
  const triggers = nodes.filter((n) => n.type === "trigger");
  let trigger: WorkflowNode | undefined;
  if (triggers.length === 0) problems.push({ kind: "no_trigger" });
  else if (triggers.length > 1) problems.push({ kind: "multiple_triggers", nodeIds: triggers.map((t) => t.id) });
  else trigger = triggers[0];

  // --- structure: trigger must be a root (in-degree 0) ---
  if (trigger && (indegree.get(trigger.id) ?? 0) > 0)
    problems.push({ kind: "trigger_has_incoming", nodeId: trigger.id });

  // --- config: topology-independent, runs for every node ---
  for (const n of nodes) {
    const result = strictConfigSchemas[n.type].safeParse(n.config);
    if (!result.success) {
      const issues: ConfigIssue[] = result.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      }));
      problems.push({ kind: "invalid_config", nodeId: n.id, issues });
    }
  }

  // --- cycle detection + topological order: ONE DFS over ALL nodes ---
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>(nodes.map((n) => [n.id, WHITE]));
  const finished: string[] = [];   // finish order; reversed = topological order
  const path: string[] = [];       // current recursion path, for cycle reconstruction
  let cycle: string[] | null = null;

  function dfs(u: string) {
    color.set(u, GRAY);
    path.push(u);
    for (const v of adjacency.get(u) ?? []) {
      if (cycle) break;                       // one cycle is enough to report
      const c = color.get(v);
      if (c === GRAY) {                        // back edge to an in-progress node = cycle
        cycle = path.slice(path.indexOf(v));   // exact path from v around to u
      } else if (c === WHITE) {
        dfs(v);
      }
    }
    path.pop();
    color.set(u, BLACK);
    finished.push(u);
  }
  for (const n of nodes) if (color.get(n.id) === WHITE && !cycle) dfs(n.id);
  if (cycle) problems.push({ kind: "cycle", nodeIds: cycle });

  // --- reachability: separate walk, seeded ONLY from the single trigger ---
  if (trigger) {
    const seen = new Set<string>();
    const stack = [trigger.id];
    while (stack.length) {
      const u = stack.pop()!;
      if (seen.has(u)) continue;
      seen.add(u);
      for (const v of adjacency.get(u) ?? []) if (!seen.has(v)) stack.push(v);
    }
    for (const n of nodes) if (!seen.has(n.id)) problems.push({ kind: "unreachable", nodeId: n.id });
  }

  if (problems.length > 0) return { ok: false, problems };
  return { ok: true, order: finished.reverse() };
}