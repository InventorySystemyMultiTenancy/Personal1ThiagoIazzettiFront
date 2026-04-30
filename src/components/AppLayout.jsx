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
    <div className="min-h-screen bg-[#080808] text-[#f4ead2]">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[220px_1fr]">
        {/* SIDEBAR */}
        <aside className="flex flex-col border-r border-white/[0.05] bg-[#0b0b0b] px-3 py-6">
          {/* Logo */}
          <div className="mb-8 flex items-center gap-3 px-2">
            <div className="relative">
              <img
                src="/logo.svg"
                alt="Thiago Iazzetti"
                className="h-10 w-10 rounded-2xl bg-white/10 object-cover p-0.5"
              />
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0b0b0b] bg-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white leading-tight">
                Thiago Iazzetti
              </p>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/30 leading-tight mt-0.5">
                {roleLabel}
              </p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 space-y-0.5">
            <p className="mb-3 px-3 text-[9px] font-bold uppercase tracking-[0.4em] text-white/20">
              Navegação
            </p>
            {navItems.map((item) => (
              <SidebarLink
                key={item.path}
                to={`/${item.path}`}
                label={item.label}
                icon={item.icon}
              />
            ))}
          </nav>

          {/* Bottom user info */}
          <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#b5f03c]/20 text-[10px] font-bold text-[#b5f03c]">
                {user?.email?.[0]?.toUpperCase() ?? "U"}
              </div>
              <p className="text-xs font-medium text-white/60 truncate flex-1">
                {user?.email}
              </p>
            </div>
            <p className="text-[10px] text-white/25 truncate pl-8">
              {tenantId}
            </p>
          </div>
        </aside>

        <section className="flex min-h-screen flex-col">
          <header className="flex items-center justify-between border-b border-white/[0.05] bg-[#080808]/90 px-6 py-3.5 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex items-center gap-2.5">
              <div className="h-2 w-2 rounded-full bg-[#b5f03c] shadow-[0_0_8px_rgba(181,240,60,0.6)]" />
              <p className="text-sm font-semibold text-white/70">
                {isPersonal ? "Painel do Personal" : "Minha Área"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/"
                className="flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-xs text-white/50 transition hover:border-white/15 hover:text-white/80"
              >
                <Bell size={12} />
                Página pública
              </Link>
              <button
                type="button"
                onClick={signOut}
                className="flex items-center gap-1.5 rounded-lg bg-white/[0.06] border border-white/[0.07] px-3 py-1.5 text-xs text-white/60 transition hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400"
              >
                <LogOut size={12} />
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
