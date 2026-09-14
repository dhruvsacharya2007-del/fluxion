// client/src/pages/DashboardPage.tsx
import { useState } from "react";
import { useNavigate } from "react-router";
import type { WorkflowListResponse } from "@fluxion/shared";
import { useAuth } from "../auth/AuthContext";
import { useApiQuery } from "../lib/useApiQuery";
import { apiFetch, ApiFetchError } from "../lib/api";

export function DashboardPage() {
  const { state: auth, logout } = useAuth();
  const navigate = useNavigate();

  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  if (auth.status !== "authenticated") return null; // narrowing bridge

  async function createWorkflow() {
    setCreating(true);
    setActionError(null);
    try {
      const { workflow } = await apiFetch<{ workflow: { id: string } }>("/workflows", {
        method: "POST",
        body: JSON.stringify({ name: "Untitled workflow" }),
      });
      navigate(`/workflows/${workflow.id}`);
    } catch (e) {
      setActionError(e instanceof ApiFetchError ? e.apiError.message : "Couldn’t create workflow");
      setCreating(false);
    }
  }

  async function deleteWorkflow(id: string, name: string) {
    if (!window.confirm(`Delete “${name}”? This can’t be undone.`)) return;
    setActionError(null);
    try {
      await apiFetch<void>(`/workflows/${id}`, { method: "DELETE" });
      setReloadKey((k) => k + 1);
    } catch (e) {
      setActionError(e instanceof ApiFetchError ? e.apiError.message : "Couldn’t delete workflow");
    }
  }

  return (
    <div className="screen wide">
      <header className="row">
        <h1>Fluxion</h1>
        <div className="row">
          <span>{auth.user.email}</span>
          <button onClick={() => void logout()}>Log out</button>
        </div>
      </header>

      <div className="row">
        <h2>Workflows</h2>
        <button onClick={() => void createWorkflow()} disabled={creating}>
          {creating ? "Creating…" : "New workflow"}
        </button>
      </div>
      {actionError && <p className="form-error" role="alert">{actionError}</p>}

      <WorkflowList key={reloadKey} onDelete={deleteWorkflow} />
    </div>
  );
}

function WorkflowList({ onDelete }: { onDelete: (id: string, name: string) => void }) {
  const navigate = useNavigate();
  const query = useApiQuery<WorkflowListResponse>("/workflows");

  if (query.status === "loading") return <p>Loading workflows…</p>;
  if (query.status === "error") return <p className="form-error">Couldn’t load workflows.</p>;

  const { workflows } = query.data;
  if (workflows.length === 0) {
    return (
      <div className="empty">
        <p>No workflows yet.</p>
        <p>Create your first one to start building.</p>
      </div>
    );
  }

  return (
    <ul className="wf-list">
      {workflows.map((wf) => (
        <li key={wf.id} className="row">
          <button className="link" onClick={() => navigate(`/workflows/${wf.id}`)}>{wf.name}</button>
          <span className="muted">{new Date(wf.updatedAt).toLocaleDateString()}</span>
          <button onClick={() => onDelete(wf.id, wf.name)}>Delete</button>
        </li>
      ))}
    </ul>
  );
}