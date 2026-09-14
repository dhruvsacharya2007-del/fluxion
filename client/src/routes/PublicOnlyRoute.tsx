
import { Navigate, Outlet } from "react-router";
import { useAuth } from "../auth/AuthContext";

export function PublicOnlyRoute() {
  const { state } = useAuth();
  if (state.status === "loading")
    return <div className="screen">Checking session…</div>;
  if (state.status === "authenticated")
    return <Navigate to="/" replace />;  // logged-in user shouldn't see /login
  return <Outlet />;                     // unauthenticated OR error → allow the forms
}