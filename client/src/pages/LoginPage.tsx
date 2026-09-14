// client/src/pages/LoginPage.tsx
import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router";
import type { ApiError } from "@fluxion/shared";
import { useAuth } from "../auth/AuthContext";
import { ApiFetchError } from "../lib/api";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ email, password });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiFetchError ? err.apiError
        : { type: "internal", code: "INTERNAL_ERROR", message: "Unexpected error" });
    } finally {
      setSubmitting(false);
    }
  }

  // discriminated narrowing — the whole point of the shared contract:
  const formError  = error && error.type !== "validation" ? error.message : null;
  const fieldErrors = error && error.type === "validation" ? error.fieldErrors : undefined;

  return (
    <form onSubmit={onSubmit} className="screen">
      <h1>Log in</h1>
      {formError && <p role="alert" className="form-error">{formError}</p>}

      <label>Email
        <input type="email" value={email} autoComplete="email"
          onChange={(e) => setEmail(e.target.value)} />
      </label>
      {fieldErrors?.email?.map((m) => <p key={m} className="field-error">{m}</p>)}

      <label>Password
        <input type="password" value={password} autoComplete="current-password"
          onChange={(e) => setPassword(e.target.value)} />
      </label>
      {fieldErrors?.password?.map((m) => <p key={m} className="field-error">{m}</p>)}

      <button type="submit" disabled={submitting}>
        {submitting ? "Logging in…" : "Log in"}
      </button>
      <p>No account? <Link to="/register">Register</Link></p>
    </form>
  );
}