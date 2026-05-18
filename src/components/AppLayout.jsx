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
  MessageSquare,
} from "lucide-react";
import { Link, Outlet } from "react-router-dom";
import SidebarLink from "./SidebarLink.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useTenant } from "../contexts/TenantContext.jsx";
import { useI18n } from "../contexts/I18nContext.jsx";
import LanguageSwitcher from "./LanguageSwitcher.jsx";

export default function AppLayout() {
  const { tenantId } = useTenant();
  const { user, isPersonal, signOut } = useAuth();
  const { t } = useI18n();

  const adminNavItems = [
    {
      label: t("NAV_OVERVIEW_THIAGOIAZZETTI", "Visao Geral"),
      path: "admin",
      icon: BarChart3,
    },
    {
      label: t("NAV_STUDENTS_THIAGOIAZZETTI", "Alunos"),
      path: "admin/alunos",
      icon: Users,
    },
    {
      label: t("NAV_PLANS_THIAGOIAZZETTI", "Planos"),
      path: "admin/planos",
      icon: Wallet,
    },
    {
      label: t("NAV_WORKOUTS_THIAGOIAZZETTI", "Treinos"),
      path: "admin/treinos",
      icon: Dumbbell,
    },
    {
      label: t("NAV_SCHEDULE_THIAGOIAZZETTI", "Agenda"),
      path: "admin/agenda",
      icon: CalendarDays,
    },
    {
      label: t("NAV_DIETS_THIAGOIAZZETTI", "Dietas"),
      path: "admin/dietas",
      icon: Salad,
    },
    {
      label: t("NAV_COMMUNICATION_THIAGOIAZZETTI", "Comunicacao"),
      path: "admin/comunicacao",
      icon: MessageSquare,
    },
    {
      label: t("NAV_PHYSICAL_ASSESSMENT_THIAGOIAZZETTI", "Avaliação Física"),
      path: "admin/avaliacao-fisica",
      icon: BarChart3,
    },
  ];

  const clientNavItems = [
    {
      label: t("NAV_MY_PANEL_THIAGOIAZZETTI", "Meu Painel"),
      path: "cliente",
      icon: Sparkles,
    },
    {
      label: t("NAV_PLANS_THIAGOIAZZETTI", "Planos"),
      path: "cliente/planos",
      icon: Wallet,
    },
    {
      label: t("NAV_WORKOUTS_THIAGOIAZZETTI", "Treinos"),
      path: "cliente/treinos",
      icon: Dumbbell,
    },
    {
      label: t("NAV_SCHEDULE_THIAGOIAZZETTI", "Agenda"),
      path: "cliente/agenda",
      icon: CalendarDays,
    },
    {
      label: t("NAV_COMMUNICATION_THIAGOIAZZETTI", "Comunicacao"),
      path: "cliente/comunicacao",
      icon: MessageSquare,
    },
    {
      label: t("NAV_PHYSICAL_ASSESSMENT_THIAGOIAZZETTI", "Avaliação Física"),
      path: "cliente/avaliacao-fisica",
      icon: BarChart3,
    },
  ];

  const navItems = isPersonal ? adminNavItems : clientNavItems;
  const roleLabel = isPersonal
    ? t("ROLE_PERSONAL_ADMIN_THIAGOIAZZETTI", "Personal Admin")
    : t("ROLE_STUDENT_THIAGOIAZZETTI", "Aluno");

  return (
    <div className="min-h-screen bg-[#080808] text-[#f4ead2]">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[220px_1fr]">
        {/* SIDEBAR */}
        <aside className="flex flex-col border-r border-white/[0.05] bg-[#0b0b0b] px-3 py-6">
          {/* Logo */}
          <div className="mb-8 flex items-center gap-3 px-2">
            <div className="relative">
              <img
                src="/image.png"
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
              {t("NAV_SECTION_TITLE_THIAGOIAZZETTI", "Navegacao")}
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
                {isPersonal
                  ? t(
                      "HEADER_PERSONAL_PANEL_THIAGOIAZZETTI",
                      "Painel do Personal",
                    )
                  : t("HEADER_MY_AREA_THIAGOIAZZETTI", "Minha Area")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher compact />
              <Link
                to="/"
                className="flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-xs text-white/50 transition hover:border-white/15 hover:text-white/80"
              >
                <Bell size={12} />
                {t("HEADER_PUBLIC_PAGE_THIAGOIAZZETTI", "Pagina publica")}
              </Link>
              <button
                type="button"
                onClick={signOut}
                className="flex items-center gap-1.5 rounded-lg bg-white/[0.06] border border-white/[0.07] px-3 py-1.5 text-xs text-white/60 transition hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400"
              >
                <LogOut size={12} />
                {t("NAV_SIGN_OUT_THIAGOIAZZETTI", "Sair")}
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
