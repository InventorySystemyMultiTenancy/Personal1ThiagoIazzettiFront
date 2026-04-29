import React from "react";
import {
  BarChart3,
  Users,
  Dumbbell,
  Wallet,
  Settings,
  Crown,
  Bell,
} from "lucide-react";
import { Outlet, useParams } from "react-router-dom";
import SidebarLink from "./SidebarLink.jsx";

const navItems = [
  { label: "Dashboard", path: "dashboard", icon: BarChart3 },
  { label: "Meus Alunos", path: "alunos", icon: Users },
  { label: "Biblioteca de Treinos", path: "treinos", icon: Dumbbell },
  { label: "Financeiro", path: "financeiro", icon: Wallet },
  { label: "Configuracoes", path: "configuracoes", icon: Settings },
];

export default function AppLayout() {
  const { systemPersonalId } = useParams();

  return (
    <div className="min-h-screen bg-premium-pearl text-premium-anthracite">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[280px_1fr]">
        <aside className="border-r border-white/10 bg-premium-ink px-5 py-6">
          <div className="mb-8 flex items-center gap-3 border-b border-white/10 pb-5">
            <div className="rounded-premium border border-premium-gold/70 bg-premium-gold/10 p-2 text-premium-gold">
              <Crown size={22} />
            </div>
            <div>
              <p className="font-title text-xl text-premium-gold">
                Thiago Iazzetti
              </p>
              <p className="font-body text-xs text-white/60">
                Personal SaaS Premium
              </p>
            </div>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => (
              <SidebarLink
                key={item.path}
                to={`/${systemPersonalId}/${item.path}`}
                label={item.label}
                icon={item.icon}
              />
            ))}
          </nav>
        </aside>

        <section className="flex min-h-screen flex-col">
          <header className="flex items-center justify-between border-b border-black/5 bg-white px-5 py-4 shadow-soft">
            <div>
              <p className="font-body text-xs uppercase tracking-[0.14em] text-premium-anthracite/60">
                Tenant Ativo
              </p>
              <p className="font-title text-lg text-premium-gold">
                {systemPersonalId}
              </p>
            </div>
            <button
              type="button"
              className="flex items-center gap-2 rounded-premium border border-premium-gold px-3 py-2 font-body text-sm font-semibold text-premium-gold hover:bg-premium-gold hover:text-premium-ink"
            >
              <Bell size={16} />
              Avisos
            </button>
          </header>

          <main className="flex-1 p-5 lg:p-7">
            <Outlet />
          </main>
        </section>
      </div>
    </div>
  );
}
