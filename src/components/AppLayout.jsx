import { useState } from "react";
import {
  BarChart3,
  Users,
  Dumbbell,
  Wallet,
  Bell,
  LogOut,
  Sparkles,
  CalendarDays,
  Salad,
  MessageSquare,
  PartyPopper,
  Menu,
  X,
  UserRound,
} from "lucide-react";
import { Link, Outlet } from "react-router-dom";
import SidebarLink from "./SidebarLink.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useTenant } from "../contexts/TenantContext.jsx";
import { useI18n } from "../contexts/I18nContext.jsx";
import LanguageSwitcher from "./LanguageSwitcher.jsx";

export default function AppLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
      label: t("NAV_EVENTS_THIAGOIAZZETTI", "Eventos"),
      path: "admin/eventos",
      icon: PartyPopper,
    },
    {
      label: t("NAV_MY_DATA_THIAGOIAZZETTI", "Meus dados"),
      path: "admin/meus-dados",
      icon: UserRound,
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
        {isMobileMenuOpen && (
          <button
            type="button"
            aria-label={t("NAV_CLOSE_MENU_THIAGOIAZZETTI", "Fechar menu")}
            className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* SIDEBAR */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-[280px] max-w-[86vw] flex-col border-r border-white/[0.05] bg-[#0b0b0b] px-3 py-5 shadow-2xl shadow-black/50 transition-transform duration-300 lg:static lg:z-auto lg:w-auto lg:max-w-none lg:translate-x-0 lg:px-3 lg:py-6 lg:shadow-none ${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Logo */}
          <div className="mb-8 flex items-center justify-between gap-3 px-2">
            <div className="flex min-w-0 items-center gap-3">
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
            <button
              type="button"
              aria-label={t("NAV_CLOSE_MENU_THIAGOIAZZETTI", "Fechar menu")}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-white/70 transition hover:border-white/15 hover:text-white lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <X size={18} />
            </button>
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
                onClick={() => setIsMobileMenuOpen(false)}
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
          <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-white/[0.05] bg-[#080808]/90 px-3 py-2.5 backdrop-blur-sm sm:gap-3 sm:px-6 lg:py-3.5">
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-2.5">
              <button
                type="button"
                aria-label={t("NAV_OPEN_MENU_THIAGOIAZZETTI", "Abrir menu")}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-white/70 transition hover:border-[#b5f03c]/40 hover:text-[#b5f03c] sm:h-9 sm:w-9 sm:rounded-xl lg:hidden"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Menu size={18} />
              </button>
              <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#b5f03c] shadow-[0_0_8px_rgba(181,240,60,0.6)] sm:h-2 sm:w-2" />
              <p className="truncate text-[11px] font-semibold text-white/70 sm:text-sm">
                {isPersonal
                  ? t(
                      "HEADER_PERSONAL_PANEL_THIAGOIAZZETTI",
                      "Painel do Personal",
                    )
                  : t("HEADER_MY_AREA_THIAGOIAZZETTI", "Minha Area")}
              </p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-1.5 sm:gap-2">
              <LanguageSwitcher compact />
              <Link
                to="/"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.03] text-xs text-white/50 transition hover:border-white/15 hover:text-white/80 sm:w-auto sm:gap-1.5 sm:px-3"
              >
                <Bell size={12} />
                <span className="hidden sm:inline">
                  {t("HEADER_PUBLIC_PAGE_THIAGOIAZZETTI", "Pagina publica")}
                </span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  signOut();
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.06] text-xs text-white/60 transition hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-400 sm:w-auto sm:gap-1.5 sm:px-3"
              >
                <LogOut size={12} />
                <span className="hidden sm:inline">
                  {t("NAV_SIGN_OUT_THIAGOIAZZETTI", "Sair")}
                </span>
              </button>
            </div>
          </header>

          <main className="flex-1 px-3 py-4 sm:p-5 lg:p-7">
            <Outlet />
          </main>
        </section>
      </div>
    </div>
  );
}
