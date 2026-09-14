// client/src/pages/WorkflowDetailPage.tsx — placeholder until Day 7 (canvas)
import { useParams, Link } from "react-router";
import type { WorkflowDetailResponse } from "@fluxion/shared";
import { useApiQuery } from "../lib/useApiQuery";

export function WorkflowDetailPage() {
  const { id } = useParams();
  const query = useApiQuery<WorkflowDetailResponse>(`/workflows/${id}`);

  if (query.status === "loading") return <p className="screen">Loading…</p>;
  if (query.status === "error") return <p className="screen form-error">Not found.</p>;

  const { workflow } = query.data;
  return (
    <div className="screen wide">
      <Link to="/">← Back</Link>
      <h1>{workflow.name}</h1>
      <p className="muted">{workflow.nodes.length} nodes · {workflow.edges.length} edges</p>
      <p>Canvas comes Day 7.</p>
    </div>
  );
}