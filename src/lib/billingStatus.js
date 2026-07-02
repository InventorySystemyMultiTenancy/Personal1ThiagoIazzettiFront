import { formatDate } from "./api.js";

const PAID_STATUSES = new Set([
  "approved",
  "authorized",
  "active",
  "paid",
  "succeeded",
  "success",
  "in_good_standing",
  "current",
]);

const PENDING_STATUSES = new Set([
  "pending",
  "pending_payment",
  "in_process",
  "processing",
  "waiting_payment",
  "waiting_for_payment",
  "trialing",
]);

const PAUSED_STATUSES = new Set(["paused", "on_hold", "suspended"]);

const CANCELED_STATUSES = new Set([
  "cancelled",
  "canceled",
  "terminated",
  "inactive",
  "stopped",
]);

const OVERDUE_STATUSES = new Set([
  "rejected",
  "failed",
  "failure",
  "overdue",
  "past_due",
  "expired",
  "delayed",
  "late",
  "unpaid",
  "chargeback",
]);

function toStatusKey(value) {
  if (!value) return "";
  return String(value).trim().toLowerCase().replace(/\s+/g, "_");
}

function firstDefinedValue(values) {
  return values.find((value) => value !== undefined && value !== null && value !== "") ?? null;
}

function firstDateValue(values) {
  const raw = firstDefinedValue(values);
  return raw ? formatDate(raw) : null;
}

function getSubscriptionContainer(entity) {
  if (!entity || typeof entity !== "object") {
    return null;
  }

  return (
    entity.recurringSubscription ||
    entity.subscription ||
    entity.assinatura ||
    entity.billing ||
    entity.paymentSubscription ||
    entity.preapproval ||
    entity.latestSubscription ||
    null
  );
}

function getDueFallback(planDueDate) {
  if (!planDueDate) {
    return {
      key: "unknown",
      label: "Sem status",
      shortLabel: "Sem status",
      detail: "Sem histárico de cobrança ou vencimento informado",
      badgeClass: "border-white/20 bg-white/10 text-white/70",
      cardClass: "border-white/10",
      accentClass: "text-white/75",
    };
  }

  const now = new Date();
  const due = new Date(planDueDate);

  if (Number.isNaN(due.getTime())) {
    return {
      key: "unknown",
      label: "Sem status",
      shortLabel: "Sem status",
      detail: "Data de vencimento invalida",
      badgeClass: "border-white/20 bg-white/10 text-white/70",
      cardClass: "border-white/10",
      accentClass: "text-white/75",
    };
  }

  const diffMs = due.getTime() - now.getTime();
  const days = Math.ceil(diffMs / (24 * 60 * 60 * 1000));

  if (days < 0) {
    return {
      key: "overdue",
      label: "Mensalidade em atraso",
      shortLabel: "Em atraso",
      detail: `Venceu em ${formatDate(planDueDate)}`,
      badgeClass: "border-red-500/45 bg-red-500/20 text-red-200",
      cardClass: "border-red-500/35 bg-[rgba(127,29,29,0.24)]",
      accentClass: "text-red-200",
    };
  }

  if (days <= 6) {
    return {
      key: "pending",
      label: "Vencimento proximo",
      shortLabel: "Vence em breve",
      detail: `Proximo vencimento em ${formatDate(planDueDate)}`,
      badgeClass: "border-amber-400/45 bg-amber-400/15 text-amber-200",
      cardClass: "border-amber-400/35 bg-[rgba(120,53,15,0.24)]",
      accentClass: "text-amber-200",
    };
  }

  return {
    key: "paid",
    label: "Mensalidade em dia",
    shortLabel: "Em dia",
    detail: `Proximo vencimento em ${formatDate(planDueDate)}`,
    badgeClass: "border-emerald-400/45 bg-emerald-400/15 text-emerald-200",
    cardClass: "border-emerald-400/30 bg-[rgba(6,78,59,0.2)]",
    accentClass: "text-emerald-200",
  };
}

function getOverdueDate(value) {
  if (!value) return null;
  const due = new Date(value);
  if (Number.isNaN(due.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  return due < today ? value : null;
}

function buildMappedStatus(key, detail) {
  if (key === "paid") {
    return {
      key,
      label: "Mensalidade paga",
      shortLabel: "Pago",
      detail,
      badgeClass: "border-emerald-400/45 bg-emerald-400/15 text-emerald-200",
      cardClass: "border-emerald-400/30 bg-[rgba(6,78,59,0.2)]",
      accentClass: "text-emerald-200",
    };
  }

  if (key === "pending") {
    return {
      key,
      label: "Pagamento pendente",
      shortLabel: "Pendente",
      detail,
      badgeClass: "border-amber-400/45 bg-amber-400/15 text-amber-200",
      cardClass: "border-amber-400/35 bg-[rgba(120,53,15,0.24)]",
      accentClass: "text-amber-200",
    };
  }

  if (key === "paused") {
    return {
      key,
      label: "Assinatura pausada",
      shortLabel: "Pausada",
      detail,
      badgeClass: "border-sky-400/35 bg-sky-500/10 text-sky-100",
      cardClass: "border-sky-400/25 bg-[rgba(12,74,110,0.2)]",
      accentClass: "text-sky-100",
    };
  }

  if (key === "canceled") {
    return {
      key,
      label: "Assinatura cancelada",
      shortLabel: "Cancelada",
      detail,
      badgeClass: "border-white/20 bg-white/10 text-white/70",
      cardClass: "border-white/10",
      accentClass: "text-white/75",
    };
  }

  return {
    key: "overdue",
    label: "Mensalidade não paga",
    shortLabel: "Não pago",
    detail,
    badgeClass: "border-red-500/45 bg-red-500/20 text-red-200",
    cardClass: "border-red-500/35 bg-[rgba(127,29,29,0.24)]",
    accentClass: "text-red-200",
  };
}

export function getBillingStatus(entity) {
  const subscription = getSubscriptionContainer(entity);
  const planDueDate = firstDefinedValue([
    entity?.planDueDate,
    entity?.plan_due_date,
    entity?.dueDate,
    entity?.due_date,
  ]);
  const overduePlanDueDate = getOverdueDate(planDueDate);

  if (overduePlanDueDate) {
    return getDueFallback(overduePlanDueDate);
  }

  const statusKey = toStatusKey(
    firstDefinedValue([
      entity?.paymentStatus,
      entity?.subscriptionStatus,
      entity?.billingStatus,
      entity?.monthlyStatus,
      entity?.statusPagamento,
      entity?.latestPayment?.status,
      entity?.lastPayment?.status,
      subscription?.status,
      subscription?.subscription_status,
      subscription?.payment_status,
      subscription?.billing_status,
      subscription?.status_detail,
    ]),
  );

  const paidAt = firstDateValue([
    entity?.paidAt,
    entity?.lastPaidAt,
    entity?.latestPayment?.paidAt,
    entity?.lastPayment?.paidAt,
    subscription?.paidAt,
    subscription?.lastPaymentDate,
    subscription?.last_payment_date,
  ]);

  const nextChargeAt = firstDateValue([
    entity?.nextChargeAt,
    entity?.nextBillingDate,
    entity?.planDueDate,
    subscription?.nextChargeAt,
    subscription?.nextPaymentDate,
    subscription?.next_payment_date,
    subscription?.date_created,
  ]);

  let resolvedKey = "";
  if (PAID_STATUSES.has(statusKey)) resolvedKey = "paid";
  else if (PENDING_STATUSES.has(statusKey)) resolvedKey = "pending";
  else if (PAUSED_STATUSES.has(statusKey)) resolvedKey = "paused";
  else if (CANCELED_STATUSES.has(statusKey)) resolvedKey = "canceled";
  else if (OVERDUE_STATUSES.has(statusKey)) resolvedKey = "overdue";

  if (!resolvedKey) {
    return getDueFallback(planDueDate || subscription?.nextPaymentDate);
  }

  let detail = "Status de cobrança atualizado pelo backend";
  if (resolvedKey === "paid") {
    detail = nextChargeAt
      ? `Próxima cobrança em ${nextChargeAt}`
      : paidAt
        ? `Último pagamento em ${paidAt}`
        : detail;
  } else if (resolvedKey === "pending") {
    detail = nextChargeAt
      ? `Aguardando confirmação até ${nextChargeAt}`
      : "Aguardando confirmação da cobrança";
  } else if (resolvedKey === "paused") {
    detail = nextChargeAt
      ? `Retomada prevista para ${nextChargeAt}`
      : "O backend marcou a assinatura como pausada";
  } else if (resolvedKey === "canceled") {
    detail = paidAt
      ? `Último ciclo pago em ${paidAt}`
      : "A assinatura foi interrompida";
  } else if (paidAt) {
    detail = `Última tentativa registrada em ${paidAt}`;
  } else if (nextChargeAt) {
    detail = `Vencimento associado em ${nextChargeAt}`;
  } else {
    detail = "Existe pendência de pagamento para este ciclo";
  }

  return buildMappedStatus(resolvedKey, detail);
}
