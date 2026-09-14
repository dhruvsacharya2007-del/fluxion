// client/src/App.tsx
import { Routes, Route, Navigate } from "react-router";
import { ProtectedRoute } from "./routes/ProtectedRoute.tsx";
import { PublicOnlyRoute } from "./routes/PublicOnlyRoute.tsx";
import { LoginPage } from "./pages/LoginPage.tsx";
import { RegisterPage } from "./pages/RegisterPage.tsx";
import { DashboardPage } from "./pages/DashboardPage.tsx";
import { WorkflowDetailPage } from "./pages/WorkflowDetailPage.tsx";

export function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<DashboardPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
      <Route path="/workflows/:id" element={<WorkflowDetailPage />} />
    </Routes>
  );
}