import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Crown, ShieldCheck, Sparkles } from "lucide-react";
import { getTenantFromHost } from "../contexts/TenantContext.jsx";

const highlights = [
  "Login para personal e clientes",
  "Cadastro de alunos por tenant",
  "Planos e treinos conectados ao backend",
];

export default function LandingPage() {
  const tenantFromHost = getTenantFromHost();
  const navigate = useNavigate();

  const openTenant = () => {
    const t = tenantFromHost || "";
    if (!t) return;
    navigate(`/${t}/planos`);
  };

  return (
    <main className="min-h-screen bg-[#080808] text-[#f6ebcf]">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 lg:px-10">
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-[#d4af37]/40 bg-[#d4af37]/10 p-2 text-[#d4af37]">
              <Crown size={20} />
            </div>
            <div>
              <p className="font-title text-xl text-[#f5d77a]">
                Thiago Iazzetti
              </p>
              <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                Personal training premium
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/75 transition hover:border-[#d4af37]/50 hover:text-white"
            >
              Entrar
            </Link>
            <Link
              to="/cadastro"
              className="rounded-full bg-[#d4af37] px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110"
            >
              Criar conta
            </Link>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:py-16">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#d4af37]/35 bg-[#d4af37]/10 px-4 py-2 text-sm text-[#f5d77a]">
              <Sparkles size={16} />
              Sistema real, multitenant e conectado ao backend
            </div>
            <h1 className="max-w-3xl font-title text-5xl leading-none text-[#fff1cc] md:text-7xl">
              Treino, agenda e planos com visual premium.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/68">
              A plataforma saiu do demo e agora conecta personal, alunos e
              planos em um fluxo real, com login, cadastro, dashboard e acesso
              por tenant.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={openTenant}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#d4af37] px-6 py-3 text-sm font-semibold text-black transition hover:brightness-110"
              >
                Abrir planos do tenant
                <ArrowRight size={16} />
              </button>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 px-6 py-3 text-sm font-medium text-white/80 transition hover:border-[#d4af37]/55 hover:text-white"
              >
                Ir para login
              </Link>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {highlights.map((item) => (
                <div
                  key={item}
                  className="rounded-3xl border border-white/10 bg-white/4 p-4 text-sm text-white/72 backdrop-blur"
                >
                  <ShieldCheck className="mb-3 text-[#d4af37]" size={18} />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.18),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.4)] backdrop-blur">
            <p className="text-xs uppercase tracking-[0.3em] text-white/45">
              Acesso por tenant
            </p>
            <h2 className="mt-3 font-title text-3xl text-[#f5d77a]">
              Ver planos do seu personal
            </h2>
            <p className="mt-3 text-sm leading-7 text-white/68">
              Use o subdomínio do seu personal (ex.:
              thiagoiazzetti.selfmachine.com.br) para abrir diretamente os
              planos públicos.
            </p>

            {tenantFromHost ? (
              <div className="mt-6 space-y-3">
                <p className="text-sm text-white/70">
                  Tenant detectado:{" "}
                  <strong className="text-[#f5d77a]">{tenantFromHost}</strong>
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={openTenant}
                    className="flex-1 rounded-2xl bg-[#d4af37] px-4 py-3 text-sm font-semibold text-black transition hover:brightness-110"
                  >
                    Ver planos do tenant
                  </button>
                  <Link
                    to="/cadastro"
                    className="flex-1 rounded-2xl border border-white/10 px-4 py-3 text-center text-sm text-white/80 transition hover:border-[#d4af37]/55 hover:text-white"
                  >
                    Cadastrar aluno
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                <p className="text-sm text-white/70">
                  Nenhum subdomínio detectado. Peça ao seu personal o link do
                  tenant ou use a página de cadastro.
                </p>
                <div className="mt-4 flex gap-3">
                  <Link
                    to="/cadastro"
                    className="flex-1 rounded-2xl bg-[#d4af37] px-4 py-3 text-sm font-semibold text-black transition hover:brightness-110"
                  >
                    Cadastrar aluno
                  </Link>
                  <Link
                    to="/login"
                    className="flex-1 rounded-2xl border border-white/10 px-4 py-3 text-center text-sm text-white/80 transition hover:border-[#d4af37]/55 hover:text-white"
                  >
                    Entrar
                  </Link>
                </div>
              </div>
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}
