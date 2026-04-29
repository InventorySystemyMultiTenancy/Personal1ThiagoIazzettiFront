import React, { Suspense, lazy } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { TenantProvider } from "./contexts/TenantContext.jsx";

const AppLayout = lazy(() => import("./components/AppLayout.jsx"));
const DashboardPage = lazy(() => import("./pages/DashboardPage.jsx"));
const StudentsPage = lazy(() => import("./pages/StudentsPage.jsx"));
const WorkoutBuilderPage = lazy(() => import("./pages/WorkoutBuilderPage.jsx"));
const PlaceholderPage = lazy(() => import("./pages/PlaceholderPage.jsx"));

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-premium-pearl font-body text-premium-anthracite">
      Carregando modulo...
    </div>
  );
}

function TenantShell() {
  const { systemPersonalId } = useParams();

  return (
    <TenantProvider initialPersonalId={systemPersonalId}>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="alunos" element={<StudentsPage />} />
            <Route path="treinos" element={<WorkoutBuilderPage />} />
            <Route
              path="financeiro"
              element={
                <PlaceholderPage
                  title="Financeiro"
                  subtitle="Relatorios de faturamento, assinaturas e fluxo de caixa por personal."
                />
              }
            />
            <Route
              path="configuracoes"
              element={
                <PlaceholderPage
                  title="Configuracoes"
                  subtitle="Preferencias, equipe e parametros de atendimento do personal."
                />
              }
            />
          </Route>
        </Routes>
      </Suspense>
    </TenantProvider>
  );
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to="/personal-demo/dashboard" replace />}
      />
      <Route path="/:systemPersonalId/*" element={<TenantShell />} />
      <Route
        path="*"
        element={<Navigate to="/personal-demo/dashboard" replace />}
      />
    </Routes>
  );
}
