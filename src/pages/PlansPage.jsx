import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Crown, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import {
  createStudentPlan,
  assignPlanToMyAccount,
  deleteStudentPlan,
  formatCurrency,
  getPublicPlans,
  listStudentPlans,
  updateStudentPlan,
} from "../lib/api.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useTenant } from "../contexts/TenantContext.jsx";

function PlanCard({ plan, onSelect, selected, actionLabel }) {
  return (
    <article className="flex h-full flex-col rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-white/40">
            Plano
          </p>
          <h3 className="mt-2 font-title text-2xl text-[#d9c179]">
            {plan.name}
          </h3>
        </div>
        <div className="rounded-2xl border border-[#d9b341]/30 bg-[#d9b341]/10 p-3 text-[#d9b341]">
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
          <ShieldCheck size={16} className="text-[#d9b341]" />
          Contrato vinculado ao tenant
        </div>
        <div className="flex items-center gap-2">
          <Check size={16} className="text-[#d9b341]" />
          Acesso ao plano e orientacoes do personal
        </div>
      </div>

      <button
        type="button"
        onClick={() => onSelect(plan)}
        className={`mt-6 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
          selected
            ? "bg-white text-black"
            : "bg-[#d9b341] text-black hover:brightness-110"
        }`}
      >
        {actionLabel}
      </button>
    </article>
  );
}

export default function PlansPage({ mode = "public" }) {
  const { tenantId } = useTenant();
  const { user, isClient } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    monthlyPrice: "",
    isActive: true,
  });

  const isAdminMode = mode === "admin";

  useEffect(() => {
    let cancelled = false;

    const loadPlans = async () => {
      setLoading(true);
      setMessage("");

      try {
        const items = isAdminMode
          ? await listStudentPlans(tenantId)
          : await getPublicPlans(tenantId);
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
  }, [tenantId, isAdminMode]);

  const actionLabel = useMemo(() => {
    if (isAdminMode) return "Gerenciar plano";
    if (isClient && user?.role === "ALUNO") return "Contratar este plano";
    return "Criar conta para contratar";
  }, [isAdminMode, isClient, user?.role]);

  const resetForm = () => {
    setEditingPlanId("");
    setForm({
      name: "",
      description: "",
      monthlyPrice: "",
      isActive: true,
    });
  };

  const handleSelect = async (plan) => {
    if (isAdminMode) {
      setEditingPlanId(plan.id);
      setForm({
        name: plan.name || "",
        description: plan.description || "",
        monthlyPrice: String(Number(plan.monthlyPriceCents || 0) / 100),
        isActive: plan.isActive !== false,
      });
      setMessage(`Editando plano: ${plan.name}`);
      return;
    }

    if (!user || user.role !== "ALUNO") {
      setMessage("Crie uma conta ou faca login como aluno para contratar.");
      return;
    }

    try {
      await assignPlanToMyAccount(plan.id, tenantId);
      setMessage(`Plano ${plan.name} contratado com sucesso.`);
    } catch (error) {
      setMessage(error?.message || "Nao foi possivel contratar o plano");
    }
  };

  const handleAdminSave = async (event) => {
    event.preventDefault();

    if (!form.name.trim() || !form.monthlyPrice) {
      setMessage("Nome e preco mensal sao obrigatorios");
      return;
    }

    const monthlyPriceNumber = Number(form.monthlyPrice);
    if (!Number.isFinite(monthlyPriceNumber) || monthlyPriceNumber <= 0) {
      setMessage("Preco mensal invalido");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        monthlyPriceCents: Math.round(monthlyPriceNumber * 100),
        isActive: form.isActive,
      };

      if (editingPlanId) {
        const updated = await updateStudentPlan(
          editingPlanId,
          payload,
          tenantId,
        );
        setPlans((prev) =>
          prev.map((plan) => (plan.id === editingPlanId ? updated : plan)),
        );
        setMessage("Plano atualizado com sucesso");
      } else {
        const created = await createStudentPlan(payload, tenantId);
        setPlans((prev) => [created, ...prev]);
        setMessage("Plano criado com sucesso");
      }

      resetForm();
    } catch (error) {
      setMessage(error?.message || "Nao foi possivel salvar o plano");
    } finally {
      setSaving(false);
    }
  };

  const handleAdminDelete = async () => {
    if (!editingPlanId) return;

    const confirmed = window.confirm(
      "Tem certeza que deseja excluir este plano? Esta acao nao pode ser desfeita.",
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      await deleteStudentPlan(editingPlanId, tenantId);
      setPlans((prev) => prev.filter((plan) => plan.id !== editingPlanId));
      setMessage("Plano excluido com sucesso");
      resetForm();
    } catch (error) {
      setMessage(error?.message || "Nao foi possivel excluir o plano");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="space-y-6">
      <section className="rounded-4xl border border-white/10 bg-[radial-gradient(circle_at_top,rgba(217,179,65,0.2),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-white/40">
              Catálogo do tenant
            </p>
            <h1 className="mt-2 font-title text-4xl text-[#f2e3b3]">
              Planos publicos
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/68">
              Aqui voce ve os planos criados pelo personal e pode contratar a
              opcao ideal quando estiver logado como aluno.
            </p>
          </div>
          {/* Tenant detected via subdomínio — não exibir campo editável */}
        </div>

        {tenantId ? (
          <div className="mt-5 flex flex-wrap gap-3 text-sm text-white/70">
            <Link
              to={`/`}
              className="rounded-full border border-white/10 px-4 py-2 transition hover:border-[#d9b341]/50 hover:text-white"
            >
              Abrir página inicial
            </Link>
            <Link
              to={user?.role === "ALUNO" ? "/cliente" : "/login"}
              className="rounded-full bg-[#d9b341] px-4 py-2 font-semibold text-black transition hover:brightness-110"
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

      {isAdminMode ? (
        <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-title text-2xl text-[#f2e3b3]">
              {editingPlanId ? "Editar plano" : "Novo plano"}
            </h2>
            {editingPlanId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/70"
              >
                Cancelar edicao
              </button>
            ) : null}
          </div>

          <form
            className="mt-4 grid gap-3 md:grid-cols-2"
            onSubmit={handleAdminSave}
          >
            <label className="text-sm text-white/70 md:col-span-1">
              Nome do plano
              <input
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-2 text-white outline-none"
                placeholder="Ex: Plano Premium"
              />
            </label>

            <label className="text-sm text-white/70 md:col-span-1">
              Preco mensal (R$)
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.monthlyPrice}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, monthlyPrice: e.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-2 text-white outline-none"
                placeholder="99.90"
              />
            </label>

            <label className="text-sm text-white/70 md:col-span-2">
              Descricao
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-2 text-white outline-none"
                placeholder="Descreva o que inclui no plano"
              />
            </label>

            <label className="inline-flex items-center gap-2 text-sm text-white/75 md:col-span-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, isActive: e.target.checked }))
                }
              />
              Plano ativo
            </label>

            <div className="md:col-span-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-2xl bg-[#d9b341] px-5 py-3 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-60"
                >
                  {saving
                    ? "Salvando..."
                    : editingPlanId
                      ? "Salvar alteracoes"
                      : "Criar plano"}
                </button>

                {editingPlanId ? (
                  <button
                    type="button"
                    onClick={handleAdminDelete}
                    disabled={saving}
                    className="rounded-2xl border border-red-400/45 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:opacity-60"
                  >
                    Excluir plano
                  </button>
                ) : null}
              </div>
            </div>
          </form>
        </section>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-white/65">
          <Loader2 className="animate-spin text-[#d9b341]" size={18} />
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
