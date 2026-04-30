import React from "react";
import {
  BarChart3,
  Users,
  Dumbbell,
  Wallet,
  Settings,
  Crown,
  Bell,
  LogOut,
  Sparkles,
  CalendarDays,
  Salad,
} from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";
import SidebarLink from "./SidebarLink.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useTenant } from "../contexts/TenantContext.jsx";

const adminNavItems = [
  { label: "Visao Geral", path: "admin", icon: BarChart3 },
  { label: "Alunos", path: "admin/alunos", icon: Users },
  { label: "Planos", path: "admin/planos", icon: Wallet },
  { label: "Treinos", path: "admin/treinos", icon: Dumbbell },
  { label: "Agenda", path: "admin/agenda", icon: CalendarDays },
  { label: "Dietas", path: "admin/dietas", icon: Salad },
];

const clientNavItems = [
  { label: "Meu Painel", path: "cliente", icon: Sparkles },
  { label: "Planos", path: "cliente/planos", icon: Wallet },
  { label: "Treinos", path: "cliente/treinos", icon: Dumbbell },
  { label: "Agenda", path: "cliente/agenda", icon: CalendarDays },
];

export default function AppLayout() {
  const { tenantId } = useTenant();
  const { user, isPersonal, signOut } = useAuth();
  const location = useLocation();

  const navItems = isPersonal ? adminNavItems : clientNavItems;
  const roleLabel = isPersonal ? "Personal Admin" : "Aluno";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f4ead2]">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[300px_1fr]">
        <aside className="border-r border-[#d9b341]/20 bg-[radial-gradient(circle_at_top,rgba(217,179,65,0.18),transparent_38%),linear-gradient(180deg,#090909_0%,#111111_100%)] px-5 py-6">
          <div className="mb-8 flex items-center gap-3 border-b border-white/10 pb-5">
            <img
              src="/logo.svg"
              alt="Thiago Iazzetti Personal Premium"
              className="h-14 w-14 rounded-2xl bg-white object-cover p-1 shadow-[0_0_24px_rgba(217,179,65,0.16)]"
            />
            <div>
              <p className="font-title text-xl text-[#d9c179]">
                Thiago Iazzetti
              </p>
              <p className="font-body text-xs text-white/60">
                {roleLabel} • {tenantId || "tenant"}
              </p>
            </div>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => (
              <SidebarLink
                key={item.path}
                to={`/${item.path}`}
                label={item.label}
                icon={item.icon}
                activeHint={location.pathname.includes(item.path)}
              />
            ))}
          </nav>
        </aside>

        <section className="flex min-h-screen flex-col">
          <header className="flex flex-col gap-4 border-b border-white/10 bg-black/30 px-5 py-4 backdrop-blur md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-title text-lg text-[#d9c179]">{tenantId}</p>
              <p className="font-body text-sm text-white/55">{user?.email}</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 font-body text-sm text-white/80 transition hover:border-[#d9b341]/50 hover:text-white"
              >
                <Bell size={16} />
                Publico
              </Link>
              <button
                type="button"
                onClick={signOut}
                className="flex items-center gap-2 rounded-2xl border border-[#d9b341]/60 bg-[#d9b341] px-3 py-2 font-body text-sm font-semibold text-black transition hover:brightness-110"
              >
                <LogOut size={16} />
                Sair
              </button>
            </div>
          </header>

          <main className="flex-1 p-5 lg:p-7">
            <Outlet />
          </main>
        </section>
      </div>
    </div>
  );
}
