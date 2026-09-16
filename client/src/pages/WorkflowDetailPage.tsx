import { useParams, Link } from "react-router";
import { useApiQuery } from "../lib/useApiQuery";
import type { WorkflowDetailResponse } from "@fluxion/shared";
import { WorkflowCanvas } from "./WorkflowCanvas";

export default function WorkflowDetailPage() {
  const { id } = useParams();
  const state = useApiQuery<WorkflowDetailResponse>(`/workflows/${id}`);

  if (state.status === "loading") return <p className="muted">Loading workflow…</p>;
  if (state.status === "error") {
    return (
      <div className="screen">
        <p>Workflow not found.</p>
        <Link className="link" to="/">← Back to dashboard</Link>
      </div>
    );
  }

  const detail = state.data.workflow;
  const isEmpty = detail.nodes.length === 0;

  return (
    <div className="screen wide">
      <header className="row">
        <h1>{detail.name}</h1>
        <Link className="link" to="/">← Dashboard</Link>
      </header>

      {isEmpty ? (
        <p className="empty">This workflow has no nodes yet.</p>
      ) : (
        // The sized container. Explicit height so React Flow doesn't collapse to 0px.
        <div style={{ height: "calc(100vh - 160px)", border: "1px solid #ddd", borderRadius: 8 }}>
          <WorkflowCanvas detail={detail} />
        </div>
      )}
    </div>
  );
}