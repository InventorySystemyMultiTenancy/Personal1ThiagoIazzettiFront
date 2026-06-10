import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Star,
  Play,
  ChevronDown,
  X,
  Palette,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getTenantFromHost, useTenant } from "../contexts/TenantContext.jsx";
import {
  listPublicStudentPlans,
  formatCurrency,
  getBillingIntervalSuffix,
} from "../lib/api.js";
import {
  DEFAULT_FOOTER_PROFILE,
  loadFooterProfile,
} from "../lib/footerProfile.js";
import LanguageSwitcher from "../components/LanguageSwitcher.jsx";
import { useI18n } from "../contexts/I18nContext.jsx";
import { useThemeMode } from "../lib/themeMode.js";

const WHATSAPP_NUMBER = "5511965949300";

function whatsappLink() {
  // wa.me opens native app on mobile and web on desktop
  return `https://wa.me/${WHATSAPP_NUMBER}`;
}

function getPlanSummary(plan) {
  const text = String(plan?.summary || plan?.description || "").trim();
  if (!text) return "";
  if (text.length <= 120) return text;
  return `${text.slice(0, 117).trim()}...`;
}

function getPlanImageUrl(plan) {
  return plan?.imageUrl || plan?.image_url || "";
}

function getCarouselPosition(index, activeIndex, total) {
  const raw = index - activeIndex;
  if (raw > total / 2) return raw - total;
  if (raw < -total / 2) return raw + total;
  return raw;
}

export default function LandingPage() {
  const { t } = useI18n();
  const { tenantId: contextTenantId } = useTenant();
  const { isMilitaryTheme, toggleThemeMode } = useThemeMode();
  const tenantFromHost = getTenantFromHost() || contextTenantId || "";
  const [showPlans, setShowPlans] = useState(false);
  const [expandedPlanId, setExpandedPlanId] = useState("");
  const [activePlanIndex, setActivePlanIndex] = useState(0);
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [footerProfile, setFooterProfile] = useState(DEFAULT_FOOTER_PROFILE);
  const plansRef = useRef(null);
  const touchStartXRef = useRef(null);
  const marqueeItems = [
    t("HOME_MARQUEE_MUSCULATION_THIAGOIAZZETTI", "Musculação"),
    t("HOME_MARQUEE_WEIGHT_LOSS_THIAGOIAZZETTI", "Emagrecimento"),
    t("HOME_MARQUEE_MASS_GAIN_THIAGOIAZZETTI", "Ganho de Massa"),
    t("HOME_MARQUEE_HYPERTROPHY_THIAGOIAZZETTI", "Hipertrofia"),
    t("HOME_MARQUEE_CONDITIONING_THIAGOIAZZETTI", "Condicionamento"),
    t("HOME_MARQUEE_FUNCTIONAL_THIAGOIAZZETTI", "Treino Funcional"),
    t("HOME_MARQUEE_HIIT_THIAGOIAZZETTI", "HIIT"),
    t("HOME_MARQUEE_MOBILITY_THIAGOIAZZETTI", "Mobilidade"),
    t("HOME_MARQUEE_STRENGTH_THIAGOIAZZETTI", "Força"),
    t("HOME_MARQUEE_ENDURANCE_THIAGOIAZZETTI", "Resistência"),
  ];
  const plansEmojiMarquee = ["🏋️", "💪🏼", "🏆", "🏅", "🏋️‍♂️", "👟"];

  useEffect(() => {
    if (!showPlans) return;
    let cancelled = false;

    const loadPlans = async () => {
      setPlansLoading(true);
      try {
        const data = await listPublicStudentPlans(tenantFromHost || undefined);
        if (!cancelled) {
          setPlans(Array.isArray(data) ? data : []);
        }
      } catch {
        if (!cancelled) {
          setPlans([]);
        }
      } finally {
        if (!cancelled) {
          setPlansLoading(false);
        }
      }
    };

    loadPlans();

    return () => {
      cancelled = true;
    };
  }, [showPlans, tenantFromHost]);

  useEffect(() => {
    if (showPlans && plansRef.current) {
      plansRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showPlans]);

  useEffect(() => {
    if (activePlanIndex >= plans.length) {
      setActivePlanIndex(0);
    }
  }, [activePlanIndex, plans.length]);

  useEffect(() => {
    if (
      !showPlans ||
      plans.length <= 1 ||
      isCarouselPaused ||
      expandedPlanId
    ) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActivePlanIndex((current) => (current + 1) % plans.length);
    }, 4200);

    return () => window.clearInterval(timer);
  }, [expandedPlanId, isCarouselPaused, plans.length, showPlans]);

  useEffect(() => {
    setFooterProfile(loadFooterProfile(tenantFromHost || "default"));
  }, [tenantFromHost]);

  const goToPreviousPlan = () => {
    setExpandedPlanId("");
    setActivePlanIndex((current) =>
      plans.length ? (current - 1 + plans.length) % plans.length : 0,
    );
  };

  const goToNextPlan = () => {
    setExpandedPlanId("");
    setActivePlanIndex((current) =>
      plans.length ? (current + 1) % plans.length : 0,
    );
  };

  const handleCarouselTouchStart = (event) => {
    touchStartXRef.current = event.touches[0]?.clientX ?? null;
  };

  const handleCarouselTouchEnd = (event) => {
    if (touchStartXRef.current === null) return;

    const endX = event.changedTouches[0]?.clientX ?? touchStartXRef.current;
    const distance = endX - touchStartXRef.current;
    touchStartXRef.current = null;

    if (Math.abs(distance) < 45) return;

    if (distance > 0) {
      goToPreviousPlan();
    } else {
      goToNextPlan();
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0a0a0a] text-white">
      {/* Background */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: isMilitaryTheme
            ? "radial-gradient(ellipse 80% 60% at 60% 40%, rgba(181,240,60,0.18) 0%, rgba(63,74,47,0.1) 70%), radial-gradient(ellipse 50% 80% at 80% 60%, rgba(117,133,77,0.28) 0%, transparent 60%), linear-gradient(180deg,#4b5637 0%,#39442d 45%,#2f3825 100%)"
            : "radial-gradient(ellipse 80% 60% at 60% 40%, rgba(60,80,40,0.45) 0%, rgba(10,10,10,0.0) 70%), radial-gradient(ellipse 50% 80% at 80% 60%, rgba(30,50,20,0.3) 0%, transparent 60%), linear-gradient(180deg,#0a0a0a 0%,#111810 40%,#0a0a0a 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
        }}
      />
      <div
        className="landing-page-bg-image pointer-events-none fixed inset-0 z-0 opacity-25"
        aria-hidden="true"
      />
      {/* NAV + HERO + MARQUEE — tudo numa tela só */}
      <div className="relative z-10 flex flex-col lg:min-h-screen">
        {/* NAV */}
        <nav className="flex items-center justify-between px-6 py-5 lg:px-14">
          <div className="flex items-center gap-3">
            <img
              src="/image.png"
              alt="Thiago Iazzetti"
              className="h-11 w-11 rounded-full bg-white/10 object-contain p-1"
            />
            <span className="hidden font-bold tracking-wide text-[#b5f03c] sm:block">
              THIAGO IAZZETTI
            </span>
          </div>

          <div className="hidden items-center gap-8 text-sm font-medium text-white/70 md:flex">
            <a href="#" className="transition hover:text-white">
              {t("NAV_HOME_THIAGOIAZZETTI", "Home")}
            </a>
            <button
              type="button"
              onClick={() => setShowPlans((v) => !v)}
              className="flex items-center gap-1 transition hover:text-white"
            >
              {t("NAV_PLANS_THIAGOIAZZETTI", "Planos")}
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${showPlans ? "rotate-180" : ""}`}
              />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleThemeMode}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white/60 transition hover:border-[#b5f03c]/40 hover:text-[#b5f03c]"
              title={
                isMilitaryTheme
                  ? "Usar estilo escuro"
                  : "Usar estilo verde militar"
              }
            >
              <Palette size={14} />
              <span className="hidden sm:inline">
                {isMilitaryTheme ? "Escuro" : "Militar"}
              </span>
            </button>
            <LanguageSwitcher />
            <a
              href={whatsappLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-[#b5f03c] px-5 py-2 text-sm font-bold text-black transition hover:brightness-110"
            >
              {t("NAV_CONTACT_THIAGOIAZZETTI", "Entre em contato")}
            </a>
          </div>
        </nav>

        {/* HERO */}
        <section className="relative z-10 flex flex-1 flex-col justify-center px-6 py-16 lg:px-14 lg:py-0">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_360px]">
            {/* LEFT */}
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#b5f03c]/30 bg-[#b5f03c]/10 px-4 py-1.5 text-sm text-[#b5f03c]">
                <Star size={14} fill="#b5f03c" className="text-[#b5f03c]" />
                <span className="font-semibold">4.8/5.0</span>
                <span className="text-white/50">
                  {t(
                    "HOME_REVIEWS_VERIFIED_THIAGOIAZZETTI",
                    "reviews verificados",
                  )}
                </span>
              </div>

              <h1
                className="max-w-2xl font-black uppercase leading-[0.92] tracking-tight text-[#b5f03c]"
                style={{ fontSize: "clamp(2.4rem, 6vw, 5.5rem)" }}
              >
                {t("HOME_HERO_LINE_1_THIAGOIAZZETTI", "Transforme")}
                <br />
                {t("HOME_HERO_LINE_2_THIAGOIAZZETTI", "sua jornada")}
                <br />
                <span className="text-white">
                  {t("HOME_HERO_LINE_3_THIAGOIAZZETTI", "hoje")}
                </span>
              </h1>

              <p className="mt-4 max-w-lg text-sm leading-6 text-white/60">
                {t(
                  "HOME_HERO_DESCRIPTION_THIAGOIAZZETTI",
                  "Libere seu potencial com planos de treino personalizados, especialmente para você.",
                )}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-4">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-full bg-[#b5f03c] px-7 py-3.5 text-sm font-bold text-black transition hover:brightness-110"
                >
                  {t("HOME_JOIN_US_THIAGOIAZZETTI", "Junte-se a nós")}
                  <ArrowRight size={16} />
                </Link>
                <button
                  type="button"
                  onClick={() => setShowPlans((v) => !v)}
                  className="group inline-flex items-center gap-3 text-sm text-white/70 transition hover:text-white"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/5 transition group-hover:border-[#b5f03c]/50 group-hover:bg-[#b5f03c]/10">
                    <Play size={14} fill="currentColor" />
                  </span>
                  {t("HOME_VIEW_PLANS_THIAGOIAZZETTI", "Ver planos")}
                </button>
              </div>
            </div>

            {/* RIGHT — stats card */}
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex -space-x-2">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="h-8 w-8 rounded-full border-2 border-[#0a0a0a] bg-gradient-to-br from-[#b5f03c] to-[#6db820]"
                    />
                  ))}
                </div>
                <span className="text-sm text-white/60">
                  <strong className="text-white">4k+</strong>{" "}
                  {t("HOME_MEMBERS_THIAGOIAZZETTI", "membros")}
                </span>
              </div>

              <p className="text-sm leading-6 text-white/60">
                {t(
                  "HOME_STATS_DESCRIPTION_THIAGOIAZZETTI",
                  "Libere seu potencial com planos de treino personalizados, especialmente para você.",
                )}
              </p>

              <Link
                to={tenantFromHost ? "/login" : "/cadastro"}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#b5f03c] py-3 text-sm font-bold text-black transition hover:brightness-110"
              >
                {t("HOME_JOIN_US_THIAGOIAZZETTI", "Junte-se a nós")}
                <ArrowRight size={15} />
              </Link>

              {tenantFromHost && (
                <p className="mt-3 text-center text-xs text-white/40">
                  {t(
                    "HOME_WELCOME_PLATFORM_THIAGOIAZZETTI",
                    "Bem-vindo! Acesse a plataforma de",
                  )}{" "}
                  <span className="text-[#b5f03c]">{tenantFromHost}</span>
                </p>
              )}
            </div>
          </div>
        </section>

        {/* PLANS SECTION */}
        {showPlans && (
          <section ref={plansRef} className="relative z-10 px-6 py-12 lg:px-14">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.35em] text-white/30">
                  {t("HOME_AVAILABLE_THIAGOIAZZETTI", "Disponíveis")}
                </p>
                <h2 className="mt-1 text-3xl font-black text-white">
                  {t("HOME_OUR_PLANS_THIAGOIAZZETTI", "Nossos Planos")}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowPlans(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/50 transition hover:border-white/20 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {plansLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#b5f03c] border-t-transparent" />
              </div>
            ) : plans.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 py-16 text-center">
                <p className="text-white/40">
                  {t(
                    "HOME_NO_PLANS_THIAGOIAZZETTI",
                    "Nenhum plano disponível no momento.",
                  )}
                </p>
                <a
                  href={whatsappLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#b5f03c] px-6 py-2.5 text-sm font-bold text-black"
                >
                  {t("HOME_TALK_TO_US_THIAGOIAZZETTI", "Fale conosco")}
                </a>
              </div>
            ) : (
              <div
                className="relative overflow-visible rounded-[2rem] border border-[#b5f03c]/20 bg-[#07120b]/45 px-3 py-6 shadow-[0_0_60px_rgba(181,240,60,0.12)] sm:px-8 sm:py-8 lg:px-14"
                onMouseEnter={() => setIsCarouselPaused(true)}
                onMouseLeave={() => setIsCarouselPaused(false)}
                onFocus={() => setIsCarouselPaused(true)}
                onBlur={() => setIsCarouselPaused(false)}
              >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(181,240,60,0.16),transparent_34%),linear-gradient(90deg,rgba(181,240,60,0.08),transparent_26%,transparent_74%,rgba(181,240,60,0.08))]" />
                <div
                  className="relative z-10 mx-auto mb-4 max-w-5xl overflow-hidden rounded-full border border-[#b5f03c]/20 bg-black/25 py-3 shadow-[0_0_26px_rgba(181,240,60,0.12)]"
                  aria-hidden="true"
                >
                  <div
                    className="flex w-max items-center gap-8 whitespace-nowrap text-3xl sm:text-4xl"
                    style={{ animation: "marquee 16s linear infinite" }}
                  >
                    {[...plansEmojiMarquee, ...plansEmojiMarquee, ...plansEmojiMarquee, ...plansEmojiMarquee].map(
                      (emoji, index) => (
                        <span
                          key={`${emoji}-${index}`}
                          className="drop-shadow-[0_0_12px_rgba(181,240,60,0.45)]"
                        >
                          {emoji}
                        </span>
                      ),
                    )}
                  </div>
                </div>
                <div
                  className="relative z-10 mx-auto h-[440px] w-full touch-pan-y overflow-visible sm:h-[460px] lg:h-[480px]"
                  onTouchStart={handleCarouselTouchStart}
                  onTouchEnd={handleCarouselTouchEnd}
                >
                  <button
                    type="button"
                    onClick={goToPreviousPlan}
                    className="absolute -left-3 top-[52%] z-50 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#b5f03c]/40 bg-black/55 text-[#b5f03c] shadow-[0_0_18px_rgba(181,240,60,0.22)] transition hover:bg-[#b5f03c] hover:text-black sm:flex lg:-left-4"
                    aria-label="Plano anterior"
                  >
                    <ChevronLeft size={17} />
                  </button>


                  {plans.map((plan, index) => {
                    const summary = getPlanSummary(plan);
                    const description = String(plan.description || "").trim();
                    const imageUrl = getPlanImageUrl(plan);
                    const isExpanded = expandedPlanId === plan.id;
                    const canExpand = description && description !== summary;
                    const position = getCarouselPosition(
                      index,
                      activePlanIndex,
                      plans.length,
                    );
                    const isActive = position === 0;
                    const isVisible = Math.abs(position) <= 1;
                    const translateX = position * 52;

                    return (
                      <article
                        key={plan.id}
                        className={`absolute left-1/2 top-[52%] flex h-[320px] w-[min(72vw,350px)] flex-col overflow-hidden rounded-[1.35rem] border p-4 text-left transition-all duration-500 sm:h-[340px] sm:w-[370px] sm:p-5 lg:h-[360px] lg:w-[410px] ${
                          isActive
                            ? "z-20 border-[#b5f03c]/60 bg-[#0d2517]/95 opacity-100 shadow-[0_0_48px_rgba(181,240,60,0.28)]"
                            : "z-10 border-white/10 bg-[#142018]/80 opacity-60 shadow-2xl"
                        } ${isVisible ? "" : "pointer-events-none opacity-0"}`}
                        style={{
                          transform: `translate(-50%, -50%) translateX(${translateX}%) scale(${isActive ? 1 : 0.78})`,
                        }}
                      >
                        {imageUrl ? (
                          <>
                            <div
                              className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-35"
                              style={{ backgroundImage: `url("${imageUrl}")` }}
                            />
                            <div className="pointer-events-none absolute inset-0 bg-black/45" />
                          </>
                        ) : null}
                        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(181,240,60,0.14),transparent_36%),radial-gradient(circle_at_top_right,rgba(181,240,60,0.18),transparent_34%)]" />
                        <div className="relative z-10 flex h-full flex-col">
                          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#b5f03c]">
                            {t("HOME_PLAN_LABEL_THIAGOIAZZETTI", "Plano")}
                          </p>
                          <h3 className="mt-2 line-clamp-2 text-xl font-black uppercase leading-tight text-white sm:text-2xl">
                            {plan.name}
                          </h3>

                          {(summary || description) && (
                            <div className="mt-4 space-y-3">
                              <p
                                className={`min-h-[66px] text-sm leading-5 text-white/68 ${
                                  isExpanded
                                    ? "max-h-[88px] overflow-y-auto pr-1"
                                    : "line-clamp-3"
                                }`}
                              >
                                {isExpanded
                                  ? description
                                  : summary || description}
                              </p>
                              {canExpand && isActive ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedPlanId((current) =>
                                      current === plan.id ? "" : plan.id,
                                    )
                                  }
                                  className="text-xs font-bold uppercase tracking-[0.18em] text-[#b5f03c] transition hover:text-white"
                                >
                                  {isExpanded ? "Ver resumo" : "Saber mais"}
                                </button>
                              ) : null}
                            </div>
                          )}

                          <p className="mt-auto pt-3 text-3xl font-black leading-none text-[#b5f03c] drop-shadow-[0_0_12px_rgba(181,240,60,0.45)] sm:text-4xl">
                            {formatCurrency(
                              plan.transactionAmount ??
                                (plan.monthlyPriceCents || 0) / 100,
                            )}
                            <span className="text-sm font-normal text-white/45">
                              {getBillingIntervalSuffix(plan)}
                            </span>
                          </p>

                          <a
                            href={whatsappLink()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`mt-4 flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-sm font-black uppercase tracking-wide transition ${
                              isActive
                                ? "bg-[#b5f03c] text-black shadow-[0_0_28px_rgba(181,240,60,0.45)] hover:brightness-110"
                                : "bg-white/10 text-white/70"
                            }`}
                            tabIndex={isActive ? 0 : -1}
                          >
                            {t(
                              "HOME_I_WANT_THIS_PLAN_THIAGOIAZZETTI",
                              "Quero este plano",
                            )}
                            <ArrowRight size={15} />
                          </a>
                        </div>
                      </article>
                    );
                  })}
                  <button
                    type="button"
                    onClick={goToNextPlan}
                    className="absolute -right-3 top-[52%] z-50 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#b5f03c]/40 bg-black/55 text-[#b5f03c] shadow-[0_0_18px_rgba(181,240,60,0.22)] transition hover:bg-[#b5f03c] hover:text-black sm:flex lg:-right-4"
                    aria-label="Próximo plano"
                  >
                    <ChevronRight size={17} />
                  </button>
                </div>

                <div className="relative z-10 -mt-12 hidden justify-center gap-2 opacity-80 sm:flex">
                  {[...Array(8)].map((_, index) => (
                    <span
                      key={index}
                      className="h-3 w-9 skew-x-[-25deg] bg-[#b5f03c] shadow-[0_0_18px_rgba(181,240,60,0.65)]"
                    />
                  ))}
                </div>

                <div className="relative z-10 mt-3 flex justify-center gap-2">
                  {plans.map((plan, index) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => {
                        setExpandedPlanId("");
                        setActivePlanIndex(index);
                      }}
                      className={`h-2.5 rounded-full transition-all ${
                        index === activePlanIndex
                          ? "w-8 bg-[#b5f03c]"
                          : "w-2.5 bg-white/25 hover:bg-white/45"
                      }`}
                      aria-label={`Ver plano ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* MARQUEE */}
        <div className="border-y border-white/10 bg-[#b5f03c] py-4 overflow-hidden">
          <div
            className="flex gap-0 whitespace-nowrap"
            style={{ animation: "marquee 28s linear infinite" }}
          >
            {[...marqueeItems, ...marqueeItems].map((item, i) => (
              <span
                key={i}
                className="mx-6 text-sm font-bold uppercase tracking-widest text-black"
              >
                {item} <span className="mx-4 opacity-40">—</span>
              </span>
            ))}
          </div>
        </div>
      </div>{" "}
      {/* fim do wrapper min-h-screen */}
      <style>{`
        .landing-page-bg-image {
          background-image: url("/horizontalmeioameio.png");
          background-position: center;
          background-repeat: no-repeat;
          background-size: cover;
        }

        @media (min-width: 768px) {
          .landing-page-bg-image {
            background-image: url("/meioameioimagem.png");
            background-position: center 58%;
            background-size: cover;
          }
        }

        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
      {/* FOOTER */}
      <footer className="relative z-10 border-t border-white/10 bg-[#0a0a0a] px-6 py-12 lg:px-14">
        <div className="max-w-7xl mx-auto grid gap-8 md:grid-cols-3 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img
                src="/image.png"
                alt="Thiago Iazzetti"
                className="h-10 w-10 rounded-full bg-white/10 object-contain p-1"
              />
              <span className="font-bold tracking-wide text-[#b5f03c]">
                {footerProfile.name || DEFAULT_FOOTER_PROFILE.name}
              </span>
            </div>
            <p className="text-sm text-white/50">
              {footerProfile.description ||
                t(
                  "FOOTER_BRAND_DESCRIPTION_THIAGOIAZZETTI",
                  DEFAULT_FOOTER_PROFILE.description,
                )}
            </p>
            {footerProfile.cref ? (
              <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-[#b5f03c]/70">
                CREF: {footerProfile.cref}
              </p>
            ) : null}
            {footerProfile.story ? (
              <p className="mt-3 text-sm leading-6 text-white/45">
                {footerProfile.story}
              </p>
            ) : null}
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-widest text-white/80 mb-3">
              {t("FOOTER_LINKS_TITLE_THIAGOIAZZETTI", "Links")}
            </h4>
            <ul className="space-y-2 text-sm text-white/50">
              <li>
                <a href="#" className="transition hover:text-[#b5f03c]">
                  {t("NAV_HOME_THIAGOIAZZETTI", "Home")}
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setShowPlans((v) => !v)}
                  className="transition hover:text-[#b5f03c]"
                >
                  {t("NAV_PLANS_THIAGOIAZZETTI", "Planos")}
                </button>
              </li>
              <li>
                <a
                  href={whatsappLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition hover:text-[#b5f03c]"
                >
                  {t("NAV_CONTACT_THIAGOIAZZETTI", "Contato")}
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-widest text-white/80 mb-3">
              {t("FOOTER_CONTACT_TITLE_THIAGOIAZZETTI", "Contato")}
            </h4>
            <a
              href={whatsappLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#b5f03c]/10 border border-[#b5f03c]/30 px-4 py-2 text-sm font-semibold text-[#b5f03c] transition hover:bg-[#b5f03c]/20"
            >
              {t(
                "FOOTER_WHATSAPP_CTA_THIAGOIAZZETTI",
                "Fale conosco no WhatsApp",
              )}
            </a>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-white/10 pt-6 text-center">
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()}{" "}
            {t(
              "FOOTER_COPYRIGHT_TEXT_THIAGOIAZZETTI",
              `${footerProfile.name || "Thiago Iazzetti"}. Todos os direitos reservados.`,
            )}
          </p>
        </div>
      </footer>
    </main>
  );
}
