// client/src/routes/ProtectedRoute.tsx
import { Navigate, Outlet } from "react-router";
import { useAuth } from "../auth/AuthContext";

export function ProtectedRoute() {
  const { state, refresh } = useAuth();
  if (state.status === "loading")
    return <div className="screen">Checking session…</div>;
  if (state.status === "error")
    return (
      <div className="screen">
        <p>Couldn’t reach the server.</p>
        <button onClick={() => void refresh()}>Retry</button>
      </div>
    );
  if (state.status === "unauthenticated")
    return <Navigate to="/login" replace />;
  return <Outlet />;                    
}