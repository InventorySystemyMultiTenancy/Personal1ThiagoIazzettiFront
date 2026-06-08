function replacePrefix(text, prefix, replacement) {
  if (!text || !text.startsWith(prefix)) {
    return null;
  }
  return `${replacement}${text.slice(prefix.length)}`;
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
    unknown: "No status",
  };

  const shortLabelByKey = {
    paid: "Paid",
    pending: "Pending",
    paused: "Paused",
    canceled: "Canceled",
    overdue: "Unpaid",
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
