// client/src/pages/RegisterPage.tsx
import { useState, type SyntheticEvent } from "react";
import { useNavigate, Link } from "react-router";
import type { ApiError } from "@fluxion/shared";
import { useAuth } from "../auth/AuthContext";
import { ApiFetchError } from "../lib/api";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [submitting, setSubmitting] = useState(false);

async function onSubmit(e: SyntheticEvent) {
  e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register({ email, password });
      navigate("/login", { replace: true });   // no auto-login (Day 3) — land on login
    } catch (err) {
      setError(err instanceof ApiFetchError ? err.apiError
        : { type: "internal", code: "INTERNAL_ERROR", message: "Unexpected error" });
    } finally {
      setSubmitting(false);
    }
  }

  const formError   = error && error.type !== "validation" ? error.message : null;
  const fieldErrors = error && error.type === "validation" ? error.fieldErrors : undefined;

  return (
    <form onSubmit={onSubmit} className="screen">
      <h1>Create account</h1>
      {formError && <p role="alert" className="form-error">{formError}</p>}

      <label>Email
        <input type="email" value={email} autoComplete="email"
          onChange={(e) => setEmail(e.target.value)} />
      </label>
      {fieldErrors?.email?.map((m) => <p key={m} className="field-error">{m}</p>)}

      <label>Password
        <input type="password" value={password} autoComplete="new-password"
          onChange={(e) => setPassword(e.target.value)} />
      </label>
      {fieldErrors?.password?.map((m) => <p key={m} className="field-error">{m}</p>)}

      <button type="submit" disabled={submitting}>
        {submitting ? "Creating…" : "Create account"}
      </button>
      <p>Have an account? <Link to="/login">Log in</Link></p>
    </form>
  );
}