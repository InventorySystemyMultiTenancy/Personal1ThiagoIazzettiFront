import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Check, Crown, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import {
  assignPlanToMyAccount,
  formatCurrency,
  getPublicPlans,
} from "../lib/api.js";
import { useAuth } from "../contexts/AuthContext.jsx";

function PlanCard({ plan, onSelect, selected, actionLabel }) {
  return (
    <article className="flex h-full flex-col rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-white/40">
            Plano
          </p>
          <h3 className="mt-2 font-title text-2xl text-[#f5d77a]">
            {plan.name}
          </h3>
        </div>
        <div className="rounded-2xl border border-[#d4af37]/30 bg-[#d4af37]/10 p-3 text-[#d4af37]">
          <Crown size={18} />
        </div>
      </div>

      <p className="mt-4 text-sm leading-7 text-white/68">
        {plan.description || "Plano premium com acompanhamento do personal."}
      </p>

      <div className="mt-6 flex items-end gap-2">
        <span className="font-title text-4xl text-white">
          {formatCurrency((plan.monthlyPriceCents || 0) / 100)}
        </span>
        <span className="pb-1 text-sm text-white/50">/mês</span>
      </div>

      <div className="mt-6 space-y-3 text-sm text-white/70">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-[#d4af37]" />
          Contrato vinculado ao tenant
        </div>
        <div className="flex items-center gap-2">
          <Check size={16} className="text-[#d4af37]" />
          Acesso ao plano e orientacoes do personal
        </div>
      </div>

      <button
        type="button"
        onClick={() => onSelect(plan)}
        className={`mt-6 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
          selected
            ? "bg-white text-black"
            : "bg-[#d4af37] text-black hover:brightness-110"
        }`}
      >
        {actionLabel}
      </button>
    </article>
  );
}

export default function PlansPage({ mode = "public" }) {
  const { tenantId } = useParams();
  const { user, isClient } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadPlans = async () => {
      setLoading(true);
      setMessage("");

      try {
        const items = await getPublicPlans(tenantId);
        if (!cancelled) {
          setPlans(Array.isArray(items) ? items : []);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(error?.message || "Nao foi possivel carregar os planos");
          setPlans([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    if (tenantId) {
      loadPlans();
    }

    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const actionLabel = useMemo(() => {
    if (mode === "admin") return "Gerenciar plano";
    if (isClient && user?.role === "ALUNO") return "Contratar este plano";
    return "Criar conta para contratar";
  }, [isClient, mode, user?.role]);

  const handleSelect = async (plan) => {
    if (mode === "admin") {
      setMessage(`Plano selecionado: ${plan.name}`);
      return;
    }

    if (!user || user.role !== "ALUNO") {
      setMessage("Crie uma conta ou faca login como aluno para contratar.");
      return;
    }

    try {
      await assignPlanToMyAccount(plan.id);
      setMessage(`Plano ${plan.name} contratado com sucesso.`);
    } catch (error) {
      setMessage(error?.message || "Nao foi possivel contratar o plano");
    }
  };

  return (
    <main className="space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.2),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-white/40">
              Catálogo do tenant
            </p>
            <h1 className="mt-2 font-title text-4xl text-[#f5d77a]">
              Planos publicos
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/68">
              Aqui voce ve os planos criados pelo personal e pode contratar a
              opcao ideal quando estiver logado como aluno.
            </p>
          </div>
          <div className="rounded-2xl border border-[#d4af37]/30 bg-[#d4af37]/10 px-4 py-3 text-sm text-[#f5d77a]">
            <Sparkles size={16} className="mr-2 inline" />
            Tenant: {tenantId || "indisponivel"}
          </div>
        </div>

        {tenantId ? (
          <div className="mt-5 flex flex-wrap gap-3 text-sm text-white/70">
            <Link
              to={`/${tenantId}`}
              className="rounded-full border border-white/10 px-4 py-2 transition hover:border-[#d4af37]/50 hover:text-white"
            >
              Abrir pagina do tenant
            </Link>
            <Link
              to={
                user?.role === "ALUNO"
                  ? `/${tenantId}/cliente`
                  : `/${tenantId}/login`
              }
              className="rounded-full bg-[#d4af37] px-4 py-2 font-semibold text-black transition hover:brightness-110"
            >
              Continuar
            </Link>
          </div>
        ) : null}
      </section>

      {message ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
          {message}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-white/65">
          <Loader2 className="animate-spin text-[#d4af37]" size={18} />
          Carregando planos...
        </div>
      ) : null}

      {!loading && plans.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-8 text-sm text-white/65">
          Nenhum plano publico encontrado para esse tenant.
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            onSelect={handleSelect}
            selected={false}
            actionLabel={actionLabel}
          />
        ))}
      </section>
    </main>
  );
}
