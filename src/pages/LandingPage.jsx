import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Star, Play, ChevronDown, X, Check } from "lucide-react";
import { getTenantFromHost, useTenant } from "../contexts/TenantContext.jsx";
import { listPublicStudentPlans, formatCurrency } from "../lib/api.js";

const WHATSAPP_NUMBER = "5511971174080";

function whatsappLink() {
  // wa.me opens native app on mobile and web on desktop
  return `https://wa.me/${WHATSAPP_NUMBER}`;
}

const marqueeItems = [
  "Musculação",
  "Emagrecimento",
  "Ganho de Massa",
  "Hipertrofia",
  "Condicionamento",
  "Treino Funcional",
  "HIIT",
  "Mobilidade",
  "Força",
  "Resistência",
];

export default function LandingPage() {
  const { tenantId: contextTenantId } = useTenant();
  const tenantFromHost = getTenantFromHost() || contextTenantId || "";
  const [showPlans, setShowPlans] = useState(false);
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const plansRef = useRef(null);

  useEffect(() => {
    if (!showPlans) return;
    setPlansLoading(true);
    listPublicStudentPlans(tenantFromHost || undefined)
      .then((data) => setPlans(Array.isArray(data) ? data : []))
      .catch(() => setPlans([]))
      .finally(() => setPlansLoading(false));
  }, [showPlans, tenantFromHost]);

  useEffect(() => {
    if (showPlans && plansRef.current) {
      plansRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showPlans]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0a0a0a] text-white">
      {/* Background */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 60% 40%, rgba(60,80,40,0.45) 0%, rgba(10,10,10,0.0) 70%), radial-gradient(ellipse 50% 80% at 80% 60%, rgba(30,50,20,0.3) 0%, transparent 60%), linear-gradient(180deg,#0a0a0a 0%,#111810 40%,#0a0a0a 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* NAV */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 lg:px-14">
        <div className="flex items-center gap-3">
          <img
            src="/logo.svg"
            alt="Thiago Iazzetti"
            className="h-11 w-11 rounded-full bg-white/10 object-contain p-1"
          />
          <span className="hidden font-bold tracking-wide text-[#b5f03c] sm:block">
            THIAGO IAZZETTI
          </span>
        </div>

        <div className="hidden items-center gap-8 text-sm font-medium text-white/70 md:flex">
          <a href="#" className="transition hover:text-white">
            Home
          </a>
          <button
            type="button"
            onClick={() => setShowPlans((v) => !v)}
            className="flex items-center gap-1 transition hover:text-white"
          >
            Planos
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${showPlans ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        <a
          href={whatsappLink()}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-[#b5f03c] px-5 py-2 text-sm font-bold text-black transition hover:brightness-110"
        >
          Entre em contato
        </a>
      </nav>

      {/* HERO */}
      <section className="relative z-10 flex min-h-[calc(100vh-80px)] flex-col justify-center px-6 pb-24 pt-8 lg:px-14">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_380px]">
          {/* LEFT */}
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#b5f03c]/30 bg-[#b5f03c]/10 px-4 py-1.5 text-sm text-[#b5f03c]">
              <Star size={14} fill="#b5f03c" className="text-[#b5f03c]" />
              <span className="font-semibold">4.8/5.0</span>
              <span className="text-white/50">reviews verificados</span>
            </div>

            <h1
              className="max-w-2xl font-black uppercase leading-[0.92] tracking-tight text-[#b5f03c]"
              style={{ fontSize: "clamp(3rem, 8vw, 6.5rem)" }}
            >
              Transforme
              <br />
              sua jornada
              <br />
              <span className="text-white">hoje</span>
            </h1>

            <p className="mt-6 max-w-lg text-base leading-7 text-white/60">
              Libere seu potencial com planos de treino personalizados,
              especialmente para você.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-full bg-[#b5f03c] px-7 py-3.5 text-sm font-bold text-black transition hover:brightness-110"
              >
                Junte-se a nós
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
                Ver planos
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
                <strong className="text-white">4k+</strong> membros
              </span>
            </div>

            <p className="text-sm leading-6 text-white/60">
              Libere seu potencial com planos de treino personalizados,
              especialmente para você.
            </p>

            <Link
              to={tenantFromHost ? "/login" : "/cadastro"}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#b5f03c] py-3 text-sm font-bold text-black transition hover:brightness-110"
            >
              Junte-se a nós
              <ArrowRight size={15} />
            </Link>

            {tenantFromHost && (
              <p className="mt-3 text-center text-xs text-white/40">
                Bem-vindo! Acesse a plataforma de{" "}
                <span className="text-[#b5f03c]">{tenantFromHost}</span>
              </p>
            )}
          </div>
        </div>
      </section>

      {/* PLANS SECTION */}
      {showPlans && (
        <section ref={plansRef} className="relative z-10 px-6 pb-20 lg:px-14">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-white/30">
                Disponíveis
              </p>
              <h2 className="mt-1 text-3xl font-black text-white">
                Nossos Planos
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
                Nenhum plano disponível no momento.
              </p>
              <a
                href={whatsappLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#b5f03c] px-6 py-2.5 text-sm font-bold text-black"
              >
                Fale conosco
              </a>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-7 transition-all duration-300 hover:-translate-y-1 hover:border-[#b5f03c]/30 hover:bg-white/[0.07]"
                >
                  <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-[#b5f03c]/10 blur-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-white/30">
                    Plano
                  </p>
                  <h3 className="mt-2 text-xl font-black text-white">
                    {plan.name}
                  </h3>
                  {plan.description && (
                    <p className="mt-2 text-sm text-white/50 leading-6">
                      {plan.description}
                    </p>
                  )}
                  <p className="mt-5 text-4xl font-black text-[#b5f03c] leading-none">
                    {formatCurrency((plan.monthlyPriceCents || 0) / 100)}
                    <span className="text-sm font-normal text-white/35">
                      /mês
                    </span>
                  </p>
                  <a
                    href={whatsappLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#b5f03c] py-3 text-sm font-bold text-black transition hover:brightness-110"
                  >
                    Quero este plano
                    <ArrowRight size={15} />
                  </a>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* MARQUEE */}
      <div className="relative z-10 border-y border-white/10 bg-[#b5f03c] py-4 overflow-hidden">
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

      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </main>
  );
}
