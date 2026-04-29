import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Crown, Sparkles, ShieldCheck } from "lucide-react";
import { getTenantFromHost } from "../contexts/TenantContext.jsx";

const benefits = [
  "Acesso para personal e aluno",
  "Cadastro com tenant detectado pelo subdomínio",
  "Planos, treinos e agenda conectados ao backend",
];

export default function LandingPage() {
  const tenantFromHost = getTenantFromHost();

  return (
    <main className="min-h-screen bg-[#090909] text-[#f2f2f2]">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 lg:px-10">
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <img
              src="/logo.svg"
              alt="Thiago Iazzetti Personal Premium"
              className="h-12 w-12 rounded-2xl bg-white object-cover p-1"
            />
            <div>
              <p className="font-title text-xl text-[#d9c179]">
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
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/75 transition hover:border-[#d9b341]/50 hover:text-white"
            >
              Entrar
            </Link>
            <Link
              to="/cadastro"
              className="rounded-full bg-[#d9b341] px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110"
            >
              Cadastrar
            </Link>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#d9b341]/35 bg-[#d9b341]/10 px-4 py-2 text-sm text-[#d9c179]">
              <Sparkles size={16} />
              Primeiro passo: entrar ou criar conta
            </div>
            <h1 className="max-w-3xl font-title text-5xl leading-none text-[#f2e3b3] md:text-7xl">
              Acesse sua área ou crie sua conta em poucos segundos.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/68">
              Essa é a tela inicial do sistema. Se você já tem acesso, faça
              login. Se ainda não tem, cadastre-se e o tenant será aplicado pelo
              subdomínio.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#d9b341] px-6 py-3 text-sm font-semibold text-black transition hover:brightness-110"
              >
                Entrar
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/cadastro"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 px-6 py-3 text-sm font-medium text-white/80 transition hover:border-[#d9b341]/55 hover:text-white"
              >
                Criar conta
              </Link>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {benefits.map((item) => (
                <div
                  key={item}
                  className="rounded-3xl border border-white/10 bg-white/4 p-4 text-sm text-white/72 backdrop-blur"
                >
                  <ShieldCheck className="mb-3 text-[#d9b341]" size={18} />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-4xl border border-white/10 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.18),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.4)] backdrop-blur">
            <p className="text-xs uppercase tracking-[0.3em] text-white/45">
              Entrada inicial
            </p>
            <h2 className="mt-3 font-title text-3xl text-[#d9c179]">
              Login ou cadastro
            </h2>
            <p className="mt-3 text-sm leading-7 text-white/68">
              O sistema foi pensado para começar nesta tela. Não entramos direto
              em agenda ou plano: primeiro o usuário escolhe entre entrar ou
              criar conta.
            </p>

            {tenantFromHost ? (
              <div className="mt-6 rounded-2xl border border-[#d9b341]/20 bg-[#d9b341]/10 p-4 text-sm text-white/75">
                <p className="font-semibold text-[#d9c179]">Tenant detectado</p>
                <p className="mt-1">
                  <strong>{tenantFromHost}</strong> será usado automaticamente
                  no fluxo de cadastro e login.
                </p>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                Nenhum subdomínio detectado no momento. O cadastro ainda
                funciona, mas o tenant precisa estar disponível pela URL do
                personal.
              </div>
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}
