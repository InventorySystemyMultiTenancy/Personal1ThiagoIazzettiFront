function replacePrefix(text, prefix, replacement) {
  if (!text || !text.startsWith(prefix)) {
    return null;
  }
  return `${replacement}${text.slice(prefix.length)}`;
}

function replacePattern(text, regex, buildReplacement) {
  const match = text && text.match(regex);
  if (!match) return null;
  return buildReplacement(match);
}

export function localizeBillingStatus(status, locale) {
  if (!status) return status;

  const normalizedLocale = String(locale || "").toLowerCase();
  const isEnglish = normalizedLocale.startsWith("en");

  if (!isEnglish) {
    return status;
  }

  const labelByKey = {
    paid: "Paid monthly fee",
    pending: "Payment pending",
    paused: "Subscription paused",
    canceled: "Subscription canceled",
    overdue: "Unpaid monthly fee",
    suspended: "Suspended plan - payment pending",
    unknown: "No status",
  };

  const shortLabelByKey = {
    paid: "Paid",
    pending: "Pending",
    paused: "Paused",
    canceled: "Canceled",
    overdue: "Unpaid",
    suspended: "Suspended",
    unknown: "No status",
  };

  const detail = String(status.detail || "");

  const translatedDetail =
    replacePrefix(detail, "Próxima cobrança em ", "Next charge on ") ||
    replacePrefix(detail, "Último pagamento em ", "Last payment on ") ||
    replacePrefix(
      detail,
      "Aguardando confirmação até ",
      "Awaiting confirmation until ",
    ) ||
    replacePrefix(detail, "Retomada prevista para ", "Expected resume on ") ||
    replacePrefix(detail, "Ultimo ciclo pago em ", "Last paid cycle on ") ||
    replacePrefix(
      detail,
      "Ultima tentativa registrada em ",
      "Last attempt recorded on ",
    ) ||
    replacePrefix(
      detail,
      "Vencimento associado em ",
      "Associated due date on ",
    ) ||
    replacePrefix(detail, "Venceu em ", "Expired on ") ||
    replacePrefix(detail, "Proximo vencimento em ", "Next due date on ") ||
    replacePattern(
      detail,
      /^PIX não pago há (\d+) dias\. Gere uma nova cobrança para reativar o plano\.$/,
      (m) =>
        `PIX unpaid for ${m[1]} days. Generate a new charge to reactivate the plan.`,
    ) ||
    replacePattern(
      detail,
      /^Pagamento pendente há (\d+) dias\. Vencimento: (.+)$/,
      (m) => `Payment pending for ${m[1]} days. Due date: ${m[2]}`,
    ) ||
    replacePattern(
      detail,
      /^PIX venceu em (.+)\. Gere uma nova cobrança para regularizar\.$/,
      (m) => `PIX expired on ${m[1]}. Generate a new charge to catch up.`,
    ) ||
    replacePattern(
      detail,
      /^Pague o PIX até (.+) para manter o plano ativo\.$/,
      (m) => `Pay the PIX by ${m[1]} to keep the plan active.`,
    ) ||
    (detail === "Aguardando confirmação da cobrança"
      ? "Awaiting billing confirmation"
      : null) ||
    (detail === "O backend marcou a assinatura como pausada"
      ? "Backend marked this subscription as paused"
      : null) ||
    (detail === "A assinatura foi interrompida"
      ? "The subscription was interrupted"
      : null) ||
    (detail === "Existe pendência de pagamento para este ciclo"
      ? "There is a payment issue for this cycle"
      : null) ||
    (detail === "Status de cobrança atualizado pelo backend"
      ? "Billing status updated by backend"
      : null) ||
    (detail === "Sem histórico de cobrança ou vencimento informado"
      ? "No billing history or due date informed"
      : null) ||
    (detail === "Data de vencimento invalida" ? "Invalid due date" : null) ||
    detail;

  return {
    ...status,
    label: labelByKey[status.key] || status.label,
    shortLabel: shortLabelByKey[status.key] || status.shortLabel,
    detail: translatedDetail,
  };
}
