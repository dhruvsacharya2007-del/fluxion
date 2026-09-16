import { useCallback, useState } from "react";
import {
  ReactFlow, Background, Controls, Panel,
  useNodesState, useEdgesState, addEdge,
  type Edge, type Connection, type NodeChange, type EdgeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { WorkflowDetail, NodeType, WorkflowDetailResponse } from "@fluxion/shared";
import { toReactFlow, fromReactFlow, type FluxionNode, type FluxionNodeData } from "../lib/toReactFlow";
import { apiFetch } from "../lib/api";
import { ConfigPanel } from "../pages/ConfigPanel"; // DAY 9 (adjust path if you put it elsewhere)

const NODE_TYPES: NodeType[] = ["trigger", "http", "delay", "condition", "transform"];

export function WorkflowCanvas({ detail }: { detail: WorkflowDetail }) {
  const initial = toReactFlow(detail);
  const [nodes, setNodes, onNodesChangeBase] = useNodesState<FluxionNode>(initial.nodes);
  const [edges, setEdges, onEdgesChangeBase] = useEdgesState<Edge>(initial.edges);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // DAY 9: single-source selection, read straight off the array we already own.
  const selectedNodes = nodes.filter((n) => n.selected);

  // dirty only on changes that mutate persisted state — NOT selection/dimensions
  const onNodesChange = useCallback((changes: NodeChange<FluxionNode>[]) => {
    onNodesChangeBase(changes);
    if (changes.some((c) => c.type !== "select" && c.type !== "dimensions")) setDirty(true);
  }, [onNodesChangeBase]);

  const onEdgesChange = useCallback((changes: EdgeChange<Edge>[]) => {
    onEdgesChangeBase(changes);
    if (changes.some((c) => c.type !== "select")) setDirty(true);
  }, [onEdgesChangeBase]);

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge({ ...params, id: crypto.randomUUID() }, eds));
    setDirty(true);
  }, [setEdges]);

  const addNode = useCallback((type: NodeType) => {
    setNodes((nds) => nds.concat({
      id: crypto.randomUUID(),
      position: { x: 120 + nds.length * 24, y: 120 + nds.length * 24 },
      data: { type, label: type, config: {} },
    }));
    setDirty(true);
  }, [setNodes]);

  // DAY 9: config edits bypass onNodesChange (they're our writes, not RF's), so dirty here.
  const handleNodeDataChange = useCallback((id: string, next: FluxionNodeData) => {
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: next } : n)));
    setDirty(true);
  }, [setNodes]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await apiFetch<WorkflowDetailResponse>(`/workflows/${detail.id}/graph`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fromReactFlow(nodes, edges)),
      });
      setDirty(false);
    } catch {
      // surface however you show errors; keep dirty=true so the user can retry
    } finally {
      setSaving(false);
    }
  }, [detail.id, nodes, edges]);

  // DAY 9: flex row. Outer carries height:100% down from the page's sized container;
  // the canvas wrapper stretches to it (align-items:stretch is the flex default).
  return (
    <div style={{ display: "flex", height: "100%" }}>
      <div style={{ flex: 1, minWidth: 0, height: "100%" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <Panel position="top-right">
            <div style={{ display: "flex", gap: 8 }}>
              {NODE_TYPES.map((t) => (
                <button key={t} onClick={() => addNode(t)}>+ {t}</button>
              ))}
              <button onClick={save} disabled={!dirty || saving}>
                {saving ? "Saving…" : dirty ? "Save" : "Saved"}
              </button>
            </div>
          </Panel>
          <Background />
          <Controls />
        </ReactFlow>
      </div>

      {/* DAY 9: config rail — sibling of <ReactFlow>, NOT a child. No RF provider needed. */}
      <div style={{ width: 280, flexShrink: 0, overflowY: "auto", borderLeft: "1px solid #ddd" }}>
        <ConfigPanel selectedNodes={selectedNodes} onChange={handleNodeDataChange} />
      </div>
    </div>
  );
}