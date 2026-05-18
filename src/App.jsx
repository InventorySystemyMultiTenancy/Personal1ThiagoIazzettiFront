import { Suspense } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout.jsx";
import { useAuth } from "./contexts/AuthContext.jsx";
import { TenantProvider } from "./contexts/TenantContext.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import PlansPage from "./pages/PlansPage.jsx";
import AdminDashboardPage from "./pages/AdminDashboardPage.jsx";
import ClientDashboardPage from "./pages/ClientDashboardPage.jsx";
import ClientWorkoutsPage from "./pages/ClientWorkoutsPage.jsx";
import AdminAgendaPage from "./pages/AdminAgendaPage.jsx";
import ClientAgendaPage from "./pages/ClientAgendaPage.jsx";
import AdminDietPage from "./pages/AdminDietPage.jsx";
import AdminEventsPage from "./pages/AdminEventsPage.jsx";
import StudentWorkoutHistoryPage from "./pages/StudentWorkoutHistoryPage.jsx";
import PhysicalAssessmentPage from "./pages/PhysicalAssessmentPage.jsx";

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] font-body text-white/70">
      Carregando modulo...
    </div>
  );
}

function RequireAuth() {
  const { user, loading } = useAuth();

  if (loading) {
    return <RouteFallback />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function RequireRole({ role }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== role) {
    return (
      <Navigate
        to={`/${user.role === "PERSONAL" ? "admin" : "cliente"}`}
        replace
      />
    );
  }

  return <Outlet />;
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <TenantProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cadastro" element={<RegisterPage />} />

          <Route path="/planos" element={<PlansPage />} />

          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              <Route element={<RequireRole role="PERSONAL" />}>
                <Route path="/admin" element={<AdminDashboardPage />} />
                <Route path="/admin/alunos" element={<AdminDashboardPage />} />
                <Route
                  path="/admin/avaliacao-fisica"
                  element={<PhysicalAssessmentPage />}
                />
                <Route
                  path="/admin/alunos/:studentId/treinos"
                  element={<StudentWorkoutHistoryPage />}
                />
                <Route
                  path="/admin/planos"
                  element={<PlansPage mode="admin" />}
                />
                <Route path="/admin/treinos" element={<AdminDashboardPage />} />
                <Route path="/admin/agenda" element={<AdminAgendaPage />} />
                <Route path="/admin/dietas" element={<AdminDietPage />} />
                <Route path="/admin/eventos" element={<AdminEventsPage />} />
                <Route
                  path="/admin/comunicacao"
                  element={<AdminDashboardPage />}
                />
              </Route>

              <Route element={<RequireRole role="ALUNO" />}>
                <Route path="/cliente" element={<ClientDashboardPage />} />
                <Route
                  path="/cliente/avaliacao-fisica"
                  element={<PhysicalAssessmentPage />}
                />
                <Route
                  path="/cliente/planos"
                  element={<PlansPage mode="client" />}
                />
                <Route
                  path="/cliente/treinos"
                  element={<ClientWorkoutsPage />}
                />
                <Route path="/cliente/agenda" element={<ClientAgendaPage />} />
                <Route
                  path="/cliente/comunicacao"
                  element={<ClientDashboardPage />}
                />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </TenantProvider>
    </Suspense>
  );
}
