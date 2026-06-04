import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/state/auth";
import { ObservatoryProvider } from "@/state/observatory";
import { AppShell } from "@/components/layout/AppShell";
import { LoginPage } from "@/pages/LoginPage";
import { OverviewPage } from "@/pages/OverviewPage";
import { AgentsPage } from "@/pages/AgentsPage";
import { SessionsPage } from "@/pages/SessionsPage";
import { RisksPage } from "@/pages/RisksPage";
import type { ReactNode } from "react";

function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

function Protected() {
  return (
    <RequireAuth>
      <ObservatoryProvider>
        <AppShell />
      </ObservatoryProvider>
    </RequireAuth>
  );
}

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<Protected />}>
          <Route index element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<OverviewPage />} />
          <Route path="/agents" element={<AgentsPage />} />
          <Route path="/sessions" element={<SessionsPage />} />
          <Route path="/risks" element={<RisksPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/overview" replace />} />
      </Routes>
    </AuthProvider>
  );
}
