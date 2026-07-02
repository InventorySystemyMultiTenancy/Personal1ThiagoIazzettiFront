import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Check, Crown, Image, Loader2, ShieldCheck, X } from "lucide-react";
import RecurringSubscriptionForm from "../components/RecurringSubscriptionForm.jsx";
import {
  createStudentPlan,
  deleteStudentPlan,
  BILLING_INTERVAL_OPTIONS,
  formatCurrency,
  getMyStudentProfile,
  getBillingIntervalSuffix,
  getPlanBillingIntervalMonths,
  isValidBillingIntervalMonths,
  listRecurringSubscriptionPlans,
  listStudentPlans,
  updateStudentPlan,
} from "../lib/api.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useTenant } from "../contexts/TenantContext.jsx";
import { useI18n } from "../contexts/I18nContext.jsx";

const PLANS_PAGE_FALLBACKS = {
  "en-US": {
    PLANS_TITLE_THIAGOIAZZETTI: "Public plans",
    PLANS_SUBTITLE_THIAGOIAZZETTI:
      "Here you can browse plans created by the coach and subscribe to the best option when logged in as a student.",
    PLANS_LINK_OPEN_HOME_THIAGOIAZZETTI: "Open home page",
    PLANS_LINK_CONTINUE_THIAGOIAZZETTI: "Continue",
    PLANS_NEW_TITLE_THIAGOIAZZETTI: "New plan",
    PLANS_NAME_LABEL_THIAGOIAZZETTI: "Plan name",
    PLANS_PRICE_LABEL_THIAGOIAZZETTI: "Billing amount (R$)",
    PLANS_BILLING_INTERVAL_LABEL_THIAGOIAZZETTI: "Billing recurrence",
    PLANS_DESCRIPTION_LABEL_THIAGOIAZZETTI: "Description",
    PLANS_DESCRIPTION_PLACEHOLDER_THIAGOIAZZETTI:
      "Describe what is included in the plan",
    PLANS_ACTIVE_LABEL_THIAGOIAZZETTI: "Active plan",
    PLANS_CREATE_BUTTON_THIAGOIAZZETTI: "Create plan",
    PLANS_LOADING_THIAGOIAZZETTI: "Loading plans...",
    PLANS_EMPTY_THIAGOIAZZETTI:
      "No subscription plans were found for this tenant.",
    PLANS_PLAN_LABEL_THIAGOIAZZETTI: "Plan",
    PLANS_PREMIUM_DESCRIPTION_THIAGOIAZZETTI:
      "Premium plan with coach follow-up.",
    PLANS_PER_MONTH_THIAGOIAZZETTI: "/month",
    PLANS_MONTHS_THIAGOIAZZETTI: "months",
    PLANS_PER_DAY_THIAGOIAZZETTI: "/day",
    PLANS_DAYS_THIAGOIAZZETTI: "days",
    PLANS_PROTECTED_CONTRACT_THIAGOIAZZETTI: "Protected contract",
    PLANS_CHECKOUT_PENDING_THIAGOIAZZETTI:
      "Online checkout setup is still pending",
    PLANS_RECURRING_AUTOMATIC_THIAGOIAZZETTI:
      "Automatic recurring card billing",
  },
  "it-IT": {
    PLANS_TITLE_THIAGOIAZZETTI: "Piani pubblici",
    PLANS_SUBTITLE_THIAGOIAZZETTI:
      "Qui puoi vedere i piani creati dal personal trainer e scegliere l'opzione migliore quando sei connesso come studente.",
    PLANS_LINK_OPEN_HOME_THIAGOIAZZETTI: "Apri pagina iniziale",
    PLANS_LINK_CONTINUE_THIAGOIAZZETTI: "Continua",
    PLANS_NEW_TITLE_THIAGOIAZZETTI: "Nuovo piano",
    PLANS_NAME_LABEL_THIAGOIAZZETTI: "Nome del piano",
    PLANS_PRICE_LABEL_THIAGOIAZZETTI: "Importo dell'addebito (R$)",
    PLANS_BILLING_INTERVAL_LABEL_THIAGOIAZZETTI: "Ricorrenza di pagamento",
    PLANS_DESCRIPTION_LABEL_THIAGOIAZZETTI: "Descrizione",
    PLANS_DESCRIPTION_PLACEHOLDER_THIAGOIAZZETTI:
      "Descrivi cosa include il piano",
    PLANS_ACTIVE_LABEL_THIAGOIAZZETTI: "Piano attivo",
    PLANS_CREATE_BUTTON_THIAGOIAZZETTI: "Crea piano",
    PLANS_LOADING_THIAGOIAZZETTI: "Caricamento piani...",
    PLANS_EMPTY_THIAGOIAZZETTI:
      "Nessun piano di abbonamento trovato per questo tenant.",
    PLANS_PLAN_LABEL_THIAGOIAZZETTI: "Piano",
    PLANS_PREMIUM_DESCRIPTION_THIAGOIAZZETTI:
      "Piano premium con supporto del personal trainer.",
    PLANS_PER_MONTH_THIAGOIAZZETTI: "/mêse",
    PLANS_MONTHS_THIAGOIAZZETTI: "mêsi",
    PLANS_PER_DAY_THIAGOIAZZETTI: "/giorno",
    PLANS_DAYS_THIAGOIAZZETTI: "giorni",
    PLANS_PROTECTED_CONTRACT_THIAGOIAZZETTI: "Contratto protetto",
    PLANS_CHECKOUT_PENDING_THIAGOIAZZETTI:
      "Configurazione checkout online in sospeso",
    PLANS_RECURRING_AUTOMATIC_THIAGOIAZZETTI:
      "Pagamento ricorrente automatico con carta",
  },
  "es-ES": {
    PLANS_TITLE_THIAGOIAZZETTI: "Planes publicos",
    PLANS_SUBTITLE_THIAGOIAZZETTI:
      "Aqui puedes ver los planes creados por el entrenador y contratar la opcion ideal cuando inicies sesion como alumno.",
    PLANS_LINK_OPEN_HOME_THIAGOIAZZETTI: "Abrir pagina inicial",
    PLANS_LINK_CONTINUE_THIAGOIAZZETTI: "Continuar",
    PLANS_NEW_TITLE_THIAGOIAZZETTI: "Nuevo plan",
    PLANS_NAME_LABEL_THIAGOIAZZETTI: "Nombre del plan",
    PLANS_PRICE_LABEL_THIAGOIAZZETTI: "Valor del cobro (R$)",
    PLANS_BILLING_INTERVAL_LABEL_THIAGOIAZZETTI: "Recurrencia de cobro",
    PLANS_DESCRIPTION_LABEL_THIAGOIAZZETTI: "Descripcion",
    PLANS_DESCRIPTION_PLACEHOLDER_THIAGOIAZZETTI:
      "Describe lo que incluye el plan",
    PLANS_ACTIVE_LABEL_THIAGOIAZZETTI: "Plan activo",
    PLANS_CREATE_BUTTON_THIAGOIAZZETTI: "Crear plan",
    PLANS_LOADING_THIAGOIAZZETTI: "Cargando planes...",
    PLANS_EMPTY_THIAGOIAZZETTI:
      "No se encontraron planes de suscripcion para este tenant.",
    PLANS_PLAN_LABEL_THIAGOIAZZETTI: "Plan",
    PLANS_PREMIUM_DESCRIPTION_THIAGOIAZZETTI:
      "Plan premium con acompanamiento del entrenador.",
    PLANS_PER_MONTH_THIAGOIAZZETTI: "/mês",
    PLANS_MONTHS_THIAGOIAZZETTI: "mêses",
    PLANS_PER_DAY_THIAGOIAZZETTI: "/dia",
    PLANS_DAYS_THIAGOIAZZETTI: "dias",
    PLANS_PROTECTED_CONTRACT_THIAGOIAZZETTI: "Contrato protegido",
    PLANS_CHECKOUT_PENDING_THIAGOIAZZETTI:
      "Configuracion de checkout online pendiente",
    PLANS_RECURRING_AUTOMATIC_THIAGOIAZZETTI:
      "Cobro recurrente automatico en tarjeta",
  },
};

function translatePlanPage(rawT, locale, key, fallback = "") {
  const remoteValue = rawT(key, "");
  const localValue = PLANS_PAGE_FALLBACKS[locale]?.[key];
  const hasRemoteValue = remoteValue && remoteValue !== key;
  const isLikelyUntranslated =
    locale !== "pt-BR" &&
    locale !== "pt-PT" &&
    (!hasRemoteValue || remoteValue === fallback);

  if (isLikelyUntranslated && localValue) {
    return localValue;
  }

  return hasRemoteValue ? remoteValue : localValue || fallback || key;
}

function getPlanImageUrl(plan) {
  return plan?.imageUrl || plan?.image_url || "";
}

async function readPlanImageAsDataUrl(file) {
  if (!file?.type?.startsWith("image/")) {
    throw new Error("Selecione um arquivo de imagem.");
  }

  const image = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const maxSize = 1400;
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", 0.82);
}

function PlanCard({ plan, onSelect, selected, actionLabel, t }) {
  const price = Number(
    plan.transactionAmount ?? Number(plan.monthlyPriceCents || 0) / 100,
  );
  const billingSuffix = getBillingIntervalSuffix(plan);
  const imageUrl = getPlanImageUrl(plan);

  return (
    <article
      className={`relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.3)] transition ${
        selected
          ? "border-[#b5f03c]/70 ring-1 ring-[#b5f03c]/45"
          : "border-white/10"
      }`}
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
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-white/40">
            {t("PLANS_PLAN_LABEL_THIAGOIAZZETTI", "Plano")}
          </p>
          <h3 className="mt-2 font-title text-2xl text-[#b5f03c]">
            {plan.name}
          </h3>
        </div>
        <div className="rounded-2xl border border-[#b5f03c]/30 bg-[#b5f03c]/10 p-3 text-[#b5f03c]">
          <Crown size={18} />
        </div>
      </div>

      <p className="relative z-10 mt-4 text-sm leading-7 text-white/75">
        {plan.description ||
          t(
            "PLANS_PREMIUM_DESCRIPTION_THIAGOIAZZETTI",
            "Plano premium com acompanhamento do personal.",
          )}
      </p>

      <div className="relative z-10 mt-6 flex items-end gap-2">
        <span className="font-title text-4xl text-white">
          {formatCurrency(price)}
        </span>
        <span className="pb-1 text-sm text-white/50">
          {billingSuffix}
        </span>
      </div>

      <div className="relative z-10 mt-6 space-y-3 text-sm text-white/75">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-[#b5f03c]" />
          {t("PLANS_PROTECTED_CONTRACT_THIAGOIAZZETTI", "Contrato protegido")}
        </div>
        <div className="flex items-center gap-2">
          <Check size={16} className="text-[#b5f03c]" />
          {plan.isRecurringEnabled === false
            ? t(
                "PLANS_CHECKOUT_PENDING_THIAGOIAZZETTI",
                "Checkout online pendente de configuração",
              )
            : t(
                "PLANS_RECURRING_AUTOMATIC_THIAGOIAZZETTI",
                "Cobrança recorrente automática no cartão",
              )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onSelect(plan)}
        className={`relative z-10 mt-6 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
          selected
            ? "bg-white text-black"
            : "bg-[#b5f03c] text-black hover:brightness-110"
        }`}
      >
        {actionLabel}
      </button>
    </article>
  );
}

function normalizeMatchValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function planMatchesTarget(plan, targetValues) {
  if (targetValues.length === 0) {
    return false;
  }

  const planValues = [
    plan.id,
    plan.name,
    plan.recurringPlanId,
    plan.preapproval_plan_id,
    plan.preapprovalPlanId,
    plan.alunoPlanId,
    plan.aluno_plan_id,
    plan.planId,
    plan.plan_id,
  ]
    .map(normalizeMatchValue)
    .filter(Boolean);

  return planValues.some((value) => targetValues.includes(value));
}

export default function PlansPage({ mode = "public" }) {
  const location = useLocation();
  const { t: rawT, locale } = useI18n();
  const t = useCallback(
    (key, fallback = "") => translatePlanPage(rawT, locale, key, fallback),
    [rawT, locale],
  );
  const { tenantId } = useTenant();
  const { user, isClient } = useAuth();
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState("");
  const checkoutRef = useRef(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    monthlyPrice: "",
    billingIntervalMonths: "1",
    isActive: true,
    imageUrl: "",
  });
  const [imageProcessing, setImageProcessing] = useState(false);

  const isAdminMode = mode === "admin";
  const recurringPersonalId =
    user?.personalId || import.meta.env.VITE_PERSONAL_ID || tenantId;
  const paymentFocus = useMemo(() => {
    const params = new URLSearchParams(location.search);

    return {
      enabled: params.get("pagamento") === "1",
      planId: params.get("planoId") || "",
      planName: params.get("planoNome") || "",
    };
  }, [location.search]);

  useEffect(() => {
    let cancelled = false;

    const loadPlans = async () => {
      setLoading(true);
      setMessage("");

      try {
        const items = isAdminMode
          ? await listStudentPlans(tenantId)
          : await listRecurringSubscriptionPlans(recurringPersonalId, tenantId);
        if (!cancelled) {
          setPlans(Array.isArray(items) ? items : []);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(
            error?.message ||
              t(
                "PLANS_ERROR_LOAD_THIAGOIAZZETTI",
                "Não foi possível carregar os planos",
              ),
          );
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
  }, [tenantId, isAdminMode, recurringPersonalId]);

  const actionLabel = useMemo(() => {
    if (isAdminMode)
      return t("PLANS_ACTION_MANAGE_THIAGOIAZZETTI", "Gerenciar plano");
    if (isClient && user?.role === "ALUNO")
      return t("PLANS_ACTION_SELECT_THIAGOIAZZETTI", "Selecionar plano");
    return t(
      "PLANS_ACTION_CREATE_ACCOUNT_THIAGOIAZZETTI",
      "Criar conta para contratar",
    );
  }, [isAdminMode, isClient, user?.role, t]);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) || null,
    [plans, selectedPlanId],
  );

  useEffect(() => {
    if (
      isAdminMode ||
      !paymentFocus.enabled ||
      !isClient ||
      user?.role !== "ALUNO" ||
      loading ||
      plans.length === 0 ||
      selectedPlanId
    ) {
      return;
    }

    let cancelled = false;

    const selectPaymentPlan = async () => {
      const targetValues = [paymentFocus.planId, paymentFocus.planName]
        .map(normalizeMatchValue)
        .filter(Boolean);

      if (targetValues.length === 0) {
        try {
          const profile = await getMyStudentProfile(tenantId);
          const activePlan = profile?.alunoPlan || profile?.plan || null;
          targetValues.push(
            ...[
              activePlan?.id,
              activePlan?.name,
              activePlan?.planId,
              activePlan?.plan_id,
              profile?.alunoPlanId,
              profile?.planId,
            ]
              .map(normalizeMatchValue)
              .filter(Boolean),
          );
        } catch {
          /* Se nao der para resolver pelo perfil, usa o primeiro plano. */
        }
      }

      const matchedPlan =
        plans.find((plan) => planMatchesTarget(plan, targetValues)) || plans[0];

      if (!cancelled && matchedPlan) {
        setSelectedPlanId(matchedPlan.id);
        setMessage(
          `${t("PLANS_MESSAGE_PLAN_SELECTED_THIAGOIAZZETTI", "Plano")} ${matchedPlan.name} ${t("PLANS_MESSAGE_FILL_CARD_THIAGOIAZZETTI", "selecionado. Preencha os dados do cartÃ£o para concluir a assinatura.")}`,
        );
      }
    };

    selectPaymentPlan();

    return () => {
      cancelled = true;
    };
  }, [
    isAdminMode,
    isClient,
    loading,
    paymentFocus.enabled,
    paymentFocus.planId,
    paymentFocus.planName,
    plans,
    selectedPlanId,
    tenantId,
    t,
    user?.role,
  ]);

  useEffect(() => {
    if (!paymentFocus.enabled || !selectedPlan || !checkoutRef.current) {
      return;
    }

    checkoutRef.current.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [paymentFocus.enabled, selectedPlan]);

  const resetForm = () => {
    setEditingPlanId("");
    setForm({
      name: "",
      description: "",
      monthlyPrice: "",
      billingIntervalMonths: "1",
      isActive: true,
      imageUrl: "",
    });
  };

  const handleSelect = (plan) => {
    if (isAdminMode) {
      setEditingPlanId(plan.id);
      setForm({
        name: plan.name || "",
        description: plan.description || "",
        monthlyPrice: String(Number(plan.monthlyPriceCents || 0) / 100),
        billingIntervalMonths: String(getPlanBillingIntervalMonths(plan)),
        isActive: plan.isActive !== false,
        imageUrl: getPlanImageUrl(plan),
      });
      setMessage(`Editando plano: ${plan.name}`);
      return;
    }

    if (!user || user.role !== "ALUNO") {
      setMessage(
        t(
          "PLANS_MESSAGE_LOGIN_REQUIRED_THIAGOIAZZETTI",
          "Crie uma conta ou faça login como aluno para contratar.",
        ),
      );
      return;
    }

    setSelectedPlanId(plan.id);
    setMessage(
      `${t("PLANS_MESSAGE_PLAN_SELECTED_THIAGOIAZZETTI", "Plano")} ${plan.name} ${t("PLANS_MESSAGE_FILL_CARD_THIAGOIAZZETTI", "selecionado. Preencha os dados do cartão para concluir a assinatura.")}`,
    );
  };

  const handlePlanImageChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      setImageProcessing(true);
      const imageUrl = await readPlanImageAsDataUrl(file);
      setForm((prev) => ({ ...prev, imageUrl }));
      setMessage("");
    } catch (error) {
      setMessage(error?.message || "Não foi possível carregar a imagem.");
    } finally {
      setImageProcessing(false);
    }
  };

  const handleAdminSave = async (event) => {
    event.preventDefault();

    if (!form.name.trim() || !form.monthlyPrice) {
      setMessage(
        t(
          "PLANS_MESSAGE_REQUIRED_FIELDS_THIAGOIAZZETTI",
          "Nome e valor da cobrança sao obrigatorios",
        ),
      );
      return;
    }

    if (!isValidBillingIntervalMonths(form.billingIntervalMonths)) {
      setMessage("Escolha uma recorrência de cobrança válida.");
      return;
    }

    const monthlyPriceNumber = Number(form.monthlyPrice);
    if (!Number.isFinite(monthlyPriceNumber) || monthlyPriceNumber <= 0) {
      setMessage(
        t(
          "PLANS_MESSAGE_INVALID_PRICE_THIAGOIAZZETTI",
          "Valor da cobrança invalido",
        ),
      );
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        monthlyPriceCents: Math.round(monthlyPriceNumber * 100),
        billingIntervalMonths: Number(form.billingIntervalMonths),
        isActive: form.isActive,
        imageUrl: form.imageUrl || null,
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
        setMessage(
          t(
            "PLANS_MESSAGE_UPDATED_SUCCESS_THIAGOIAZZETTI",
            "Plano atualizado com sucesso",
          ),
        );
      } else {
        const created = await createStudentPlan(payload, tenantId);
        setPlans((prev) => [created, ...prev]);
        setMessage(
          t(
            "PLANS_MESSAGE_CREATED_SUCCESS_THIAGOIAZZETTI",
            "Plano criado com sucesso",
          ),
        );
      }

      resetForm();
    } catch (error) {
      setMessage(
        error?.message ||
          t(
            "PLANS_MESSAGE_SAVE_ERROR_THIAGOIAZZETTI",
            "Não foi possível salvar o plano",
          ),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAdminDelete = async () => {
    if (!editingPlanId) return;

    const confirmed = window.confirm(
      t(
        "PLANS_CONFIRM_DELETE_THIAGOIAZZETTI",
        "Tem certeza que deseja excluir este plano? Esta ação não pode ser desfeita.",
      ),
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      await deleteStudentPlan(editingPlanId, tenantId);
      setPlans((prev) => prev.filter((plan) => plan.id !== editingPlanId));
      setMessage(
        t(
          "PLANS_MESSAGE_DELETED_SUCCESS_THIAGOIAZZETTI",
          "Plano excluido com sucesso",
        ),
      );
      resetForm();
    } catch (error) {
      setMessage(
        error?.message ||
          t(
            "PLANS_MESSAGE_DELETE_ERROR_THIAGOIAZZETTI",
            "Não foi possível excluir o plano",
          ),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="space-y-6">
      <section className="rounded-4xl border border-white/10 bg-[radial-gradient(circle_at_top,rgba(181,240,60,0.2),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="mt-2 font-title text-4xl text-[#d4f7a0]">
              {t("PLANS_TITLE_THIAGOIAZZETTI", "Planos publicos")}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/68">
              {t(
                "PLANS_SUBTITLE_THIAGOIAZZETTI",
                "Aqui você vê os planos criados pelo personal e pode contratar a opção ideal quando estiver logado como aluno.",
              )}
            </p>
          </div>
          {/* Tenant detected via subdomínio — não exibir campo editável */}
        </div>

        {tenantId ? (
          <div className="mt-5 flex flex-wrap gap-3 text-sm text-white/70">
            <Link
              to={`/`}
              className="rounded-full border border-white/10 px-4 py-2 transition hover:border-[#b5f03c]/50 hover:text-white"
            >
              {t("PLANS_LINK_OPEN_HOME_THIAGOIAZZETTI", "Abrir pagina inicial")}
            </Link>
            <Link
              to={user?.role === "ALUNO" ? "/cliente" : "/login"}
              className="rounded-full bg-[#b5f03c] px-4 py-2 font-semibold text-black transition hover:brightness-110"
            >
              {t("PLANS_LINK_CONTINUE_THIAGOIAZZETTI", "Continuar")}
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
            <h2 className="font-title text-2xl text-[#d4f7a0]">
              {editingPlanId
                ? t("PLANS_EDIT_TITLE_THIAGOIAZZETTI", "Editar plano")
                : t("PLANS_NEW_TITLE_THIAGOIAZZETTI", "Novo plano")}
            </h2>
            {editingPlanId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/70"
              >
                {t("PLANS_CANCEL_EDIT_THIAGOIAZZETTI", "Cancelar edicao")}
              </button>
            ) : null}
          </div>

          <form
            className="mt-4 grid gap-3 md:grid-cols-2"
            onSubmit={handleAdminSave}
          >
            <label className="text-sm text-white/70 md:col-span-1">
              {t("PLANS_NAME_LABEL_THIAGOIAZZETTI", "Nome do plano")}
              <input
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-2 text-white outline-none"
                placeholder={t(
                  "PLANS_NAME_PLACEHOLDER_THIAGOIAZZETTI",
                  "Ex: Plano Premium",
                )}
              />
            </label>

            <label className="text-sm text-white/70 md:col-span-1">
              {t("PLANS_PRICE_LABEL_THIAGOIAZZETTI", "Valor da cobrança (R$)")}
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

            <label className="text-sm text-white/70 md:col-span-1">
              {t(
                "PLANS_BILLING_INTERVAL_LABEL_THIAGOIAZZETTI",
                "Recorrência de cobrança",
              )}
              <select
                required
                value={form.billingIntervalMonths}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    billingIntervalMonths: e.target.value,
                  }))
                }
                className={`mt-2 w-full rounded-xl border bg-black/25 px-4 py-2 text-white outline-none ${
                  isValidBillingIntervalMonths(form.billingIntervalMonths)
                    ? "border-white/10"
                    : "border-red-400/70"
                }`}
              >
                {BILLING_INTERVAL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="text-sm text-white/70 md:col-span-1">
              <span>Imagem do plano</span>
              <div className="mt-2 overflow-hidden rounded-xl border border-white/10 bg-black/25">
                {form.imageUrl ? (
                  <div
                    className="h-36 bg-cover bg-center"
                    style={{ backgroundImage: `url("${form.imageUrl}")` }}
                    aria-label="Preview da imagem do plano"
                  />
                ) : (
                  <div className="flex h-36 items-center justify-center bg-white/[0.03] text-white/35">
                    <Image size={28} />
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2 border-t border-white/10 p-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#b5f03c] px-4 py-2 text-xs font-bold text-black transition hover:brightness-110">
                    <Image size={14} />
                    {imageProcessing
                      ? "Carregando..."
                      : form.imageUrl
                        ? "Trocar imagem"
                        : "Selecionar imagem"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePlanImageChange}
                      disabled={saving || imageProcessing}
                      className="sr-only"
                    />
                  </label>
                  {form.imageUrl ? (
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({ ...prev, imageUrl: null }))
                      }
                      disabled={saving || imageProcessing}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-400/45 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/20 disabled:opacity-60"
                    >
                      <X size={14} />
                      Remover
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <label className="text-sm text-white/70 md:col-span-2">
              {t("PLANS_DESCRIPTION_LABEL_THIAGOIAZZETTI", "Descrição")}
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-2 text-white outline-none"
                placeholder={t(
                  "PLANS_DESCRIPTION_PLACEHOLDER_THIAGOIAZZETTI",
                  "Descreva o que inclui no plano",
                )}
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
              {t("PLANS_ACTIVE_LABEL_THIAGOIAZZETTI", "Plano ativo")}
            </label>

            <div className="md:col-span-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={saving || imageProcessing}
                  className="rounded-2xl bg-[#b5f03c] px-5 py-3 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-60"
                >
                  {saving || imageProcessing
                    ? t("PLANS_SAVING_THIAGOIAZZETTI", "Salvando...")
                    : editingPlanId
                      ? t(
                          "PLANS_SAVE_CHANGES_THIAGOIAZZETTI",
                          "Salvar alterações",
                        )
                      : t("PLANS_CREATE_BUTTON_THIAGOIAZZETTI", "Criar plano")}
                </button>

                {editingPlanId ? (
                  <button
                    type="button"
                    onClick={handleAdminDelete}
                    disabled={saving}
                    className="rounded-2xl border border-red-400/45 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:opacity-60"
                  >
                    {t("PLANS_DELETE_BUTTON_THIAGOIAZZETTI", "Excluir plano")}
                  </button>
                ) : null}
              </div>
            </div>
          </form>
        </section>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-white/65">
          <Loader2 className="animate-spin text-[#b5f03c]" size={18} />
          {t("PLANS_LOADING_THIAGOIAZZETTI", "Carregando planos...")}
        </div>
      ) : null}

      {!loading && plans.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-8 text-sm text-white/65">
          {t(
            "PLANS_EMPTY_THIAGOIAZZETTI",
            "Nenhum plano de assinatura encontrado para esse tenant.",
          )}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            onSelect={handleSelect}
            selected={selectedPlanId === plan.id}
            actionLabel={actionLabel}
            t={t}
          />
        ))}
      </section>

      {!isAdminMode && user?.role === "ALUNO" && selectedPlan ? (
        <div ref={checkoutRef}>
          <RecurringSubscriptionForm
            key={selectedPlan.id}
            plan={selectedPlan}
            personalId={recurringPersonalId}
            onSuccess={() => {
              setMessage(
                `${t("PLANS_SUBSCRIPTION_SUCCESS_PREFIX_THIAGOIAZZETTI", "Assinatura do plano")} ${selectedPlan.name} ${t("PLANS_SUBSCRIPTION_SUCCESS_SUFFIX_THIAGOIAZZETTI", "criada com sucesso.")}`,
              );
            }}
          />
        </div>
      ) : null}

      {!isAdminMode && (!user || user.role !== "ALUNO") ? (
        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-white/70">
          {t(
            "PLANS_CHECKOUT_HINT_THIAGOIAZZETTI",
            "O checkout recorrente fica disponível após o login do aluno. Se ainda não tiver conta, faça seu cadastro vinculado ao tenant e volte para escolher o plano.",
          )}
        </section>
      ) : null}
    </main>
  );
}
