// client/src/pages/DashboardPage.tsx
import { useAuth } from "../auth/AuthContext";

export function DashboardPage() {
  const { state, logout } = useAuth();
  if (state.status !== "authenticated") return null;   // narrowing bridge — see below
  return (
    <div className="screen">
      <h1>Fluxion</h1>
      <p>Signed in as {state.user.email}</p>
      <button onClick={() => void logout()}>Log out</button>
    </div>
  );
}