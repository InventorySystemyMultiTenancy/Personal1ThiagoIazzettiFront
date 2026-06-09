import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadMercadoPago } from "@mercadopago/sdk-js";
import {
  CheckCircle2,
  Copy,
  CreditCard,
  Loader2,
  QrCode,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useTenant } from "../contexts/TenantContext.jsx";
import {
  createPixRecurringSubscription,
  createRecurringSubscription,
  formatCurrency,
  formatDate,
  getBillingIntervalSuffix,
  getRecurringSubscription,
  getMyStudentProfile,
  renewPixRecurringSubscription,
} from "../lib/api.js";

const MP_PUBLIC_KEY = import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY || "";
const MP_DEBUG_ENABLED = import.meta.env.VITE_DEBUG_PAYMENT === "true";

function resolveStudentId(user, profile) {
  return (
    profile?.id ||
    profile?.aluno?.id ||
    user?.alunoId ||
    user?.studentId ||
    user?.id ||
    ""
  );
}

function getFrequencyLabel(plan) {
  const frequency = Number(
    plan?.billingIntervalMonths ??
      plan?.billing_interval_months ??
      plan?.frequency ??
      1,
  );
  const frequencyType = plan?.frequency_type || plan?.frequencyType || "months";

  if (frequencyType === "days") {
    return frequency === 1 ? "por dia" : `a cada ${frequency} dias`;
  }

  return getBillingIntervalSuffix(plan).replace("/", "por");
}

function buildFieldId(prefix, field) {
  return `${prefix}__${field}`;
}

function getPlanCheckoutId(plan) {
  return plan?.recurringPlanId || plan?.preapproval_plan_id || plan?.id || "";
}

function getAlunoPlanId(plan) {
  return (
    plan?.alunoPlanId ||
    plan?.aluno_plan_id ||
    plan?.planId ||
    plan?.plan_id ||
    (plan?.id && plan.id !== plan?.recurringPlanId ? plan.id : "")
  );
}

function normalizeSubscriptionPayload(result) {
  if (!result || typeof result !== "object") {
    return { subscription: null, provider: null };
  }

  return {
    subscription:
      result.subscription ||
      result.data?.subscription ||
      result.recurringSubscription ||
      result,
    provider:
      result.provider ||
      result.data?.provider ||
      result.payment ||
      result.subscription?.provider ||
      null,
  };
}

function getSubscriptionStatusLabel(status) {
  if (status === "authorized") return "Pagamento confirmado";
  if (status === "canceled") return "Assinatura cancelada";
  if (status === "pending") return "Aguardando pagamento PIX";
  return status || "Status indisponível";
}

function getNextChargeDate(subscription) {
  return (
    subscription?.nextChargeAt ||
    subscription?.next_charge_at ||
    subscription?.nextPaymentDate ||
    subscription?.next_payment_date ||
    subscription?.current_period_end ||
    ""
  );
}

function formatExpirationTime(expiresAt) {
  if (!expiresAt) return "";
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function getPayerEmail(user, profile) {
  return user?.email || profile?.email || profile?.aluno?.email || "";
}

function getPayerName(user, profile) {
  return (
    user?.fullName ||
    user?.name ||
    profile?.fullName ||
    profile?.name ||
    profile?.aluno?.fullName ||
    profile?.aluno?.name ||
    ""
  );
}

export default function RecurringSubscriptionForm({ plan, personalId, onSuccess }) {
  const navigate = useNavigate();
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const cardFormRef = useRef(null);
  const mountTimeoutRef = useRef(null);
  const onSuccessRef = useRef(onSuccess);
  const studentIdRef = useRef("");
  const sdkStateRef = useRef("idle");
  const redirectTimeoutRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [sdkState, setSdkState] = useState("idle");
  const [feedback, setFeedback] = useState("");
  const [pixState, setPixState] = useState("idle");
  const [pixFeedback, setPixFeedback] = useState("");
  const [pixSubscription, setPixSubscription] = useState(null);
  const [pixProvider, setPixProvider] = useState(null);
  const [pixNow, setPixNow] = useState(() => Date.now());
  const [copiedPix, setCopiedPix] = useState(false);

  const resolvedStudentId = useMemo(
    () => resolveStudentId(user, studentProfile),
    [studentProfile, user],
  );

  const formPrefix = `mp-card-form-${String(plan?.id || "plano").replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const recurringPersonalId =
    personalId || user?.personalId || import.meta.env.VITE_PERSONAL_ID || tenantId;
  const sdkConfigError = !MP_PUBLIC_KEY
    ? "Configure VITE_MERCADO_PAGO_PUBLIC_KEY para habilitar o checkout recorrente."
    : "";
  const missingRecurringPlanWarning = !plan?.recurringPlanId
    ? "Este plano não trouxe preapproval_plan_id. Vamos tentar criar a assinatura usando o identificador interno do plano."
    : "";
  const shouldShowRecurringPlanWarning =
    MP_DEBUG_ENABLED && Boolean(missingRecurringPlanWarning);
  const pixStatus = pixSubscription?.status || pixProvider?.status || "";
  const pixExpiresAt = pixProvider?.expires_at || pixProvider?.expiresAt || "";
  const pixExpiresAtTime = pixExpiresAt ? new Date(pixExpiresAt).getTime() : 0;
  const pixExpired =
    Boolean(pixExpiresAtTime) &&
    Number.isFinite(pixExpiresAtTime) &&
    pixExpiresAtTime <= pixNow &&
    pixStatus !== "authorized";
  const pixQrCode = pixProvider?.qr_code || pixProvider?.qrCode || "";
  const pixQrCodeBase64 =
    pixProvider?.qr_code_base64 || pixProvider?.qrCodeBase64 || "";
  const pixQrImageSrc = pixQrCodeBase64?.startsWith("data:")
    ? pixQrCodeBase64
    : `data:image/png;base64,${pixQrCodeBase64}`;
  const pixNextCharge = getNextChargeDate(pixSubscription);
  const pixCanRenew =
    Boolean(pixSubscription?.id) &&
    pixStatus !== "authorized" &&
    (pixExpired || !pixQrCode);

  useEffect(() => {
    studentIdRef.current = resolvedStudentId;
  }, [resolvedStudentId]);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    const interval = window.setInterval(() => setPixNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    sdkStateRef.current = sdkState;
  }, [sdkState]);

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        window.clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!MP_DEBUG_ENABLED) {
      return undefined;
    }

    window.mercadoPagoDebug = true;

    const handleMessage = (event) => {
      if (event.data?.type === "MERCADOPAGO_CARDFORM_EVENT") {
        console.log("MP Event:", event.data);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      try {
        const result = await getMyStudentProfile(tenantId);
        if (!cancelled) {
          setStudentProfile(result);
        }
      } catch {
        if (!cancelled) {
          setStudentProfile(null);
        }
      }
    };

    if (tenantId && user?.role === "ALUNO") {
      loadProfile();
    }

    return () => {
      cancelled = true;
    };
  }, [tenantId, user?.role]);

  useEffect(() => {
    if (paymentMethod !== "card" || sdkConfigError) {
      return undefined;
    }

    let cancelled = false;

    const mountCardForm = async () => {
      setSdkState("loading");
      setFeedback("");

      try {
        await loadMercadoPago();

        if (cancelled) {
          return;
        }

        const MercadoPago = window.MercadoPago;
        if (typeof MercadoPago !== "function") {
          throw new Error("SDK do Mercado Pago indisponível no navegador.");
        }

        const mp = new MercadoPago(MP_PUBLIC_KEY, {
          locale: "pt-BR",
        });

        mountTimeoutRef.current = window.setTimeout(() => {
          if (!cancelled && sdkStateRef.current === "loading") {
            setSdkState("error");
            setFeedback(
              "Não foi possível inicializar o formulário de pagamento. Tente recarregar a página.",
            );
          }
        }, 12000);

        const nextCardForm = mp.cardForm({
          amount: String(plan.transactionAmount || 0),
          iframe: true,
          form: {
            id: formPrefix,
            cardNumber: {
              id: buildFieldId(formPrefix, "cardNumber"),
              placeholder: "1234 5678 9012 3456",
            },
            expirationDate: {
              id: buildFieldId(formPrefix, "expirationDate"),
              placeholder: "MM/AAAA",
            },
            securityCode: {
              id: buildFieldId(formPrefix, "securityCode"),
              placeholder: "CVV",
            },
            cardholderName: {
              id: buildFieldId(formPrefix, "cardholderName"),
              placeholder: "Nome como no cartão",
            },
            issuer: {
              id: buildFieldId(formPrefix, "issuer"),
            },
            installments: {
              id: buildFieldId(formPrefix, "installments"),
            },
            identificationType: {
              id: buildFieldId(formPrefix, "identificationType"),
            },
            identificationNumber: {
              id: buildFieldId(formPrefix, "identificationNumber"),
              placeholder: "CPF do titular",
            },
            cardholderEmail: {
              id: buildFieldId(formPrefix, "cardholderEmail"),
              placeholder: user?.email || "você@exemplo.com",
            },
          },
          callbacks: {
            onFormMounted: (error) => {
              if (cancelled) {
                return;
              }

              if (mountTimeoutRef.current) {
                window.clearTimeout(mountTimeoutRef.current);
                mountTimeoutRef.current = null;
              }

              if (error) {
                setSdkState("error");
                setFeedback("Não foi possível montar o formulário do cartão.");
                return;
              }

              setSdkState("ready");
            },
            onSubmit: async (event) => {
              event.preventDefault();

              if (cancelled || sdkStateRef.current === "submitting") {
                return;
              }

              try {
                setSdkState("submitting");
                setFeedback("");

                const cardFormData = nextCardForm.getCardFormData();
                const token = cardFormData?.token;
                const payerEmail = cardFormData?.cardholderEmail;

                if (!token) {
                  throw new Error("Token do cartão não foi gerado. Revise os dados do formulário.");
                }

                if (!payerEmail) {
                  throw new Error("Informe o email do titular para criar a assinatura.");
                }

                const payload = {
                  card_token_id: token,
                  payer_email: payerEmail,
                  reason: `Assinatura - ${plan.name}`,
                };

                if (plan?.recurringPlanId) {
                  payload.preapproval_plan_id = plan.recurringPlanId;
                }

                if (plan?.id) {
                  payload.aluno_plan_id = plan.id;
                  payload.plan_id = plan.id;
                }

                if (studentIdRef.current) {
                  payload.aluno_id = studentIdRef.current;
                }

                const result = await createRecurringSubscription(payload, recurringPersonalId);

                if (cancelled) {
                  return;
                }

                setSdkState("success");
                setFeedback(
                  result?.message ||
                    "Assinatura criada com sucesso. Redirecionando para sua area...",
                );
                onSuccessRef.current?.(result);
                redirectTimeoutRef.current = window.setTimeout(() => {
                  navigate("/cliente", { replace: true });
                }, 1800);
              } catch (error) {
                if (!cancelled) {
                  setSdkState("error");
                  setFeedback(
                    error?.message ||
                      "Não foi possível criar a assinatura recorrente.",
                  );
                }
              }
            },
            onFetching: () => {
              return () => undefined;
            },
            onError: (error) => {
              if (cancelled) {
                return;
              }

              if (mountTimeoutRef.current) {
                window.clearTimeout(mountTimeoutRef.current);
                mountTimeoutRef.current = null;
              }

              setSdkState("error");
              setFeedback(
                error?.message ||
                  "Erro no formulário do Mercado Pago. Verifique os dados e tente novamente.",
              );
            },
          },
        });

        cardFormRef.current = nextCardForm;
      } catch (error) {
        if (!cancelled) {
          setSdkState("error");
          setFeedback(
            error?.message ||
              "Falha ao inicializar o checkout recorrente do Mercado Pago.",
          );
        }
      }
    };

    mountCardForm();

    return () => {
      cancelled = true;
      cardFormRef.current = null;
      if (mountTimeoutRef.current) {
        window.clearTimeout(mountTimeoutRef.current);
        mountTimeoutRef.current = null;
      }
      if (redirectTimeoutRef.current) {
        window.clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }
    };
  }, [
    sdkConfigError,
    formPrefix,
    navigate,
    paymentMethod,
    plan,
    recurringPersonalId,
    user?.email,
  ]);

  const stopPixPolling = () => {
    if (pollingIntervalRef.current) {
      window.clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const applyPixResult = (result) => {
    const { subscription, provider } = normalizeSubscriptionPayload(result);
    if (subscription) {
      setPixSubscription(subscription);
    }
    if (provider) {
      setPixProvider(provider);
    }

    return { subscription, provider };
  };

  const refreshPixStatus = async (subscriptionId, { silent = false } = {}) => {
    if (!subscriptionId) return null;

    try {
      if (!silent) {
        setPixState("loading");
      }

      const result = await getRecurringSubscription(
        subscriptionId,
        recurringPersonalId,
      );
      const normalized = applyPixResult(result);
      const status =
        normalized.subscription?.status || normalized.provider?.status || "";

      if (status === "authorized") {
        stopPixPolling();
        setPixState("success");
        setPixFeedback("Pagamento confirmado. Sua assinatura esta ativa.");
        onSuccessRef.current?.(normalized.subscription || result);
      } else if (!silent) {
        setPixState("ready");
      }

      return normalized;
    } catch (error) {
      if (!silent) {
        setPixState("error");
        setPixFeedback(
          error?.message || "Não foi possível consultar o status da assinatura.",
        );
      }
      return null;
    }
  };

  const startPixPolling = (subscriptionId) => {
    stopPixPolling();
    if (!subscriptionId) return;

    pollingIntervalRef.current = window.setInterval(() => {
      refreshPixStatus(subscriptionId, { silent: true });
    }, 20000);
  };

  const buildPixPayload = () => {
    const payload = {
      preapproval_plan_id: getPlanCheckoutId(plan),
      payer_email: getPayerEmail(user, studentProfile),
      payer_name: getPayerName(user, studentProfile),
    };
    const alunoId = resolvedStudentId;
    const alunoPlanId = getAlunoPlanId(plan);

    if (alunoId) payload.alunoId = alunoId;
    if (alunoPlanId) payload.alunoPlanId = alunoPlanId;

    return payload;
  };

  const handleCreatePixCharge = async () => {
    try {
      setPixState("submitting");
      setPixFeedback("");
      setCopiedPix(false);

      const payload = buildPixPayload();
      if (!payload.preapproval_plan_id) {
        throw new Error("Não foi possível identificar o plano para gerar o PIX.");
      }
      if (!payload.payer_email) {
        throw new Error("Informe um email no cadastro para gerar a cobrança PIX.");
      }

      const result = await createPixRecurringSubscription(
        payload,
        recurringPersonalId,
      );
      const { subscription } = applyPixResult(result);
      const subscriptionId = subscription?.id || result?.subscription?.id;

      setPixState("ready");
      setPixFeedback("Cobranca PIX gerada. Pague o QR Code para ativar a assinatura.");
      if (subscriptionId) {
        startPixPolling(subscriptionId);
      }
    } catch (error) {
      setPixState("error");
      setPixFeedback(error?.message || "Não foi possível gerar a cobrança PIX.");
    }
  };

  const handleRenewPixCharge = async () => {
    const subscriptionId = pixSubscription?.id;
    if (!subscriptionId) return;

    try {
      setPixState("submitting");
      setPixFeedback("");
      setCopiedPix(false);
      const result = await renewPixRecurringSubscription(
        subscriptionId,
        {
          payer_email: getPayerEmail(user, studentProfile),
          payer_name: getPayerName(user, studentProfile),
        },
        recurringPersonalId,
      );
      applyPixResult(result);
      setPixState("ready");
      setPixFeedback("Nova cobrança PIX gerada.");
      startPixPolling(subscriptionId);
    } catch (error) {
      setPixState("error");
      setPixFeedback(
        error?.message || "Não foi possível gerar uma nova cobrança PIX.",
      );
    }
  };

  const handleCopyPix = async () => {
    if (!pixQrCode) return;

    try {
      await navigator.clipboard.writeText(pixQrCode);
      setCopiedPix(true);
      window.setTimeout(() => setCopiedPix(false), 1800);
    } catch {
      setPixFeedback("Não foi possível copiar automaticamente. Copie o código manualmente.");
    }
  };

  const effectiveState =
    paymentMethod === "card" && sdkConfigError ? "error" : sdkState;
  const effectiveFeedback =
    paymentMethod === "card" ? sdkConfigError || feedback : feedback;
  const isBusy = effectiveState === "loading" || effectiveState === "submitting";
  const pixIsBusy = pixState === "loading" || pixState === "submitting";
  const pixTimeLeftMs = pixExpiresAtTime ? Math.max(0, pixExpiresAtTime - pixNow) : 0;
  const pixMinutesLeft = Math.floor(pixTimeLeftMs / 60000);
  const pixSecondsLeft = Math.floor((pixTimeLeftMs % 60000) / 1000);

  return (
    <section className="rounded-[1.75rem] border border-[#b5f03c]/20 bg-[radial-gradient(circle_at_top,rgba(181,240,60,0.16),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-white/40">
            Assinatura recorrente
          </p>
          <h2 className="mt-2 font-title text-3xl text-[#d4f7a0]">
            Finalizar {plan.name}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/68">
            Escolha PIX ou cartão para iniciar a assinatura. PIX precisa ser pago mensalmente para manter a assinatura ativa.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/25 px-5 py-4 text-right">
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">
            Valor
          </p>
          <p className="mt-2 font-title text-3xl text-[#b5f03c]">
            {formatCurrency(plan.transactionAmount)}
          </p>
          <p className="mt-1 text-sm text-white/55">{getFrequencyLabel(plan)}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/20 p-1.5">
        <button
          type="button"
          onClick={() => setPaymentMethod("pix")}
          className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
            paymentMethod === "pix"
              ? "bg-[#b5f03c] text-black"
              : "text-white/55 hover:bg-white/5 hover:text-white"
          }`}
        >
          <QrCode size={16} />
          PIX
        </button>
        <button
          type="button"
          onClick={() => setPaymentMethod("card")}
          className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
            paymentMethod === "card"
              ? "bg-[#b5f03c] text-black"
              : "text-white/55 hover:bg-white/5 hover:text-white"
          }`}
        >
          <CreditCard size={16} />
          Cartao
        </button>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        {paymentMethod === "pix" ? (
          <div className="space-y-4 rounded-3xl border border-white/10 bg-black/20 p-5">
            {!pixSubscription ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-7 text-white/70">
                Gere a cobrança PIX, pague pelo QR Code e aguarde a confirmação automática. Vamos consultar o status periodicamente até o pagamento ser confirmado.
              </div>
            ) : null}

            {pixQrCodeBase64 ? (
              <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-white p-5 text-black">
                <img
                  src={pixQrImageSrc}
                  alt="QR Code PIX"
                  className="h-56 w-56 rounded-xl object-contain"
                />
                <p className="text-center text-sm font-semibold">
                  Escaneie o QR Code no app do seu banco.
                </p>
              </div>
            ) : null}

            {pixQrCode ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/35">
                    PIX copia e cola
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyPix}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:border-[#b5f03c]/50 hover:text-white"
                  >
                    {copiedPix ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                    {copiedPix ? "Copiado" : "Copiar"}
                  </button>
                </div>
                <p className="mt-3 max-h-28 overflow-auto break-all rounded-xl bg-black/30 p-3 text-xs leading-6 text-white/70">
                  {pixQrCode}
                </p>
              </div>
            ) : null}

            {pixExpiresAt ? (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  pixExpired
                    ? "border-amber-400/30 bg-amber-500/10 text-amber-100"
                    : "border-white/10 bg-white/5 text-white/70"
                }`}
              >
                {pixExpired
                  ? "Esta cobrança PIX expirou."
                  : `Expira em ${String(pixMinutesLeft).padStart(2, "0")}:${String(
                      pixSecondsLeft,
                    ).padStart(2, "0")} (${formatExpirationTime(pixExpiresAt)}).`}
              </div>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row">
              {!pixSubscription ? (
                <button
                  type="button"
                  onClick={handleCreatePixCharge}
                  disabled={pixIsBusy}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#b5f03c] px-5 py-3 text-sm font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pixIsBusy ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <QrCode size={16} />
                  )}
                  Gerar cobrança PIX
                </button>
              ) : null}

              {pixCanRenew ? (
                <button
                  type="button"
                  onClick={handleRenewPixCharge}
                  disabled={pixIsBusy}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#b5f03c] px-5 py-3 text-sm font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pixIsBusy ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <RefreshCw size={16} />
                  )}
                  Gerar nova cobrança PIX
                </button>
              ) : null}

              {pixSubscription?.id && pixStatus !== "authorized" ? (
                <button
                  type="button"
                  onClick={() => refreshPixStatus(pixSubscription.id)}
                  disabled={pixIsBusy}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-white/75 transition hover:border-[#b5f03c]/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw size={16} />
                  Atualizar status
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <form id={formPrefix} className="space-y-4 rounded-3xl border border-white/10 bg-black/20 p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm text-white/70 md:col-span-2">
                Número do cartão
                <div
                  id={buildFieldId(formPrefix, "cardNumber")}
                  className="mt-2 min-h-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                />
              </label>

              <label className="text-sm text-white/70">
                Validade
                <div
                  id={buildFieldId(formPrefix, "expirationDate")}
                  className="mt-2 min-h-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                />
              </label>

              <label className="text-sm text-white/70">
                CVV
                <div
                  id={buildFieldId(formPrefix, "securityCode")}
                  className="mt-2 min-h-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                />
              </label>

              <label className="text-sm text-white/70 md:col-span-2">
                Nome do titular
                <input
                  id={buildFieldId(formPrefix, "cardholderName")}
                  defaultValue={user?.fullName || user?.name || ""}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/30"
                  placeholder="Nome como impresso no cartão"
                />
              </label>

              <label className="text-sm text-white/70">
                Banco emissor
                <select
                  id={buildFieldId(formPrefix, "issuer")}
                  defaultValue=""
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
                >
                  <option value="">Selecione</option>
                </select>
              </label>

              <label className="text-sm text-white/70">
                Parcelas
                <select
                  id={buildFieldId(formPrefix, "installments")}
                  defaultValue=""
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
                >
                  <option value="">Selecione</option>
                </select>
              </label>

              <label className="text-sm text-white/70">
                Tipo de documento
                <select
                  id={buildFieldId(formPrefix, "identificationType")}
                  defaultValue=""
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
                >
                  <option value="">Selecione</option>
                </select>
              </label>

              <label className="text-sm text-white/70">
                Documento do titular
                <input
                  id={buildFieldId(formPrefix, "identificationNumber")}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/30"
                  placeholder="CPF"
                />
              </label>

              <label className="text-sm text-white/70 md:col-span-2">
                Email do titular
                <input
                  id={buildFieldId(formPrefix, "cardholderEmail")}
                  type="email"
                  defaultValue={user?.email || ""}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/30"
                  placeholder="você@exemplo.com"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={isBusy || Boolean(sdkConfigError)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#b5f03c] px-5 py-3 text-sm font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isBusy ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Processando assinatura...
                </>
              ) : (
                <>
                  <CreditCard size={16} />
                  Assinar por {formatCurrency(plan.transactionAmount)}{" "}
                  {getBillingIntervalSuffix(plan)}
                </>
              )}
            </button>
          </form>
        )}

        <aside className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white/70">
            <div className="flex items-center gap-2 font-semibold text-[#b5f03c]">
              <ShieldCheck size={16} />
              {paymentMethod === "pix" ? "Status da assinatura" : "Fluxo seguro"}
            </div>
            {paymentMethod === "pix" ? (
              <div className="mt-3 space-y-2">
                <p className="text-white/70">
                  {getSubscriptionStatusLabel(pixStatus)}
                </p>
                {pixNextCharge ? (
                  <p className="text-white/45">
                    Próxima cobrança: {formatDate(pixNextCharge)}
                  </p>
                ) : null}
                <p className="leading-7 text-white/55">
                  PIX precisa ser pago mensalmente para manter a assinatura ativa.
                </p>
              </div>
            ) : (
              <p className="mt-2 leading-7">
                Os dados sensíveis do cartão ficam no iframe do Mercado Pago. O frontend envia apenas o token gerado para o backend concluir a assinatura.
              </p>
            )}
          </div>

          {!resolvedStudentId ? (
            <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-100">
              Não foi possível resolver automaticamente o identificador do aluno. O backend pode rejeitar a assinatura se exigir aluno_id.
            </div>
          ) : null}

          {shouldShowRecurringPlanWarning ? (
            <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-100">
              {missingRecurringPlanWarning}
            </div>
          ) : null}

          {paymentMethod === "pix" && pixFeedback ? (
            <div
              className={`rounded-2xl border px-4 py-3 text-sm ${
                pixState === "success"
                  ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                  : pixState === "error"
                    ? "border-red-400/30 bg-red-500/10 text-red-100"
                    : "border-white/10 bg-black/20 text-white/70"
              }`}
            >
              {pixFeedback}
            </div>
          ) : null}

          {paymentMethod === "card" && effectiveFeedback ? (
            <div
              className={`rounded-2xl border px-4 py-3 text-sm ${
                effectiveState === "success"
                  ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                  : effectiveState === "error"
                    ? "border-red-400/30 bg-red-500/10 text-red-100"
                    : "border-white/10 bg-black/20 text-white/70"
              }`}
            >
              {effectiveFeedback}
            </div>
          ) : null}

          {paymentMethod === "card" && effectiveState === "loading" ? (
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm text-white/65">
              <Loader2 className="animate-spin text-[#b5f03c]" size={16} />
              Carregando formulário seguro do Mercado Pago...
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
