// ── 根组件 + 路由（含认证守卫） ──
import { Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "./pages/AuthPage.js";
import ChatPage from "./pages/ChatPage.js";
import LogsPage from "./pages/LogsPage.js";
import DashboardPage from "./pages/DashboardPage.js";

/** 路由守卫：无 token → 跳转登录 */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/" element={<RequireAuth><Navigate to="/chat" replace /></RequireAuth>} />
      <Route path="/chat" element={<RequireAuth><ChatPage /></RequireAuth>} />
      <Route path="/chat/:sessionId" element={<RequireAuth><ChatPage /></RequireAuth>} />
      <Route path="/logs/:sessionId" element={<RequireAuth><LogsPage /></RequireAuth>} />
      <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
    </Routes>
  );
}