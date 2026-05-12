import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadMercadoPago } from "@mercadopago/sdk-js";
import { CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useTenant } from "../contexts/TenantContext.jsx";
import {
  createRecurringSubscription,
  formatCurrency,
  getMyStudentProfile,
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
  const frequency = Number(plan?.frequency || 1);
  const frequencyType = plan?.frequencyType || "months";

  if (frequencyType === "days") {
    return frequency === 1 ? "por dia" : `a cada ${frequency} dias`;
  }

  return frequency === 1 ? "por mês" : `a cada ${frequency} meses`;
}

function buildFieldId(prefix, field) {
  return `${prefix}__${field}`;
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
  const [studentProfile, setStudentProfile] = useState(null);
  const [sdkState, setSdkState] = useState("idle");
  const [feedback, setFeedback] = useState("");

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
    ? "Este plano nao trouxe preapproval_plan_id. Vamos tentar criar a assinatura usando o identificador interno do plano."
    : "";
  const shouldShowRecurringPlanWarning =
    MP_DEBUG_ENABLED && Boolean(missingRecurringPlanWarning);

  useEffect(() => {
    studentIdRef.current = resolvedStudentId;
  }, [resolvedStudentId]);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    sdkStateRef.current = sdkState;
  }, [sdkState]);

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
    if (sdkConfigError) {
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
          throw new Error("SDK do Mercado Pago indisponivel no navegador.");
        }

        const mp = new MercadoPago(MP_PUBLIC_KEY, {
          locale: "pt-BR",
        });

        mountTimeoutRef.current = window.setTimeout(() => {
          if (!cancelled && sdkStateRef.current === "loading") {
            setSdkState("error");
            setFeedback(
              "Nao foi possivel inicializar o formulario de pagamento. Tente recarregar a pagina.",
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
              placeholder: "Nome como no cartao",
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
              placeholder: user?.email || "voce@exemplo.com",
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
                setFeedback("Nao foi possivel montar o formulario do cartao.");
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
                  throw new Error("Token do cartao nao foi gerado. Revise os dados do formulario.");
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
                      "Nao foi possivel criar a assinatura recorrente.",
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
                  "Erro no formulario do Mercado Pago. Verifique os dados e tente novamente.",
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
  }, [sdkConfigError, formPrefix, navigate, plan, recurringPersonalId, user?.email]);

  const effectiveState = sdkConfigError ? "error" : sdkState;
  const effectiveFeedback = sdkConfigError || feedback;
  const isBusy = effectiveState === "loading" || effectiveState === "submitting";

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
            O cartao e tokenizado no navegador pelo Mercado Pago. Seu servidor recebe apenas o token seguro para criar a cobranca mensal.
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

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <form id={formPrefix} className="space-y-4 rounded-3xl border border-white/10 bg-black/20 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-white/70 md:col-span-2">
              Numero do cartao
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
                placeholder="Nome como impresso no cartao"
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
                placeholder="voce@exemplo.com"
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
                Assinar por {formatCurrency(plan.transactionAmount)}
              </>
            )}
          </button>
        </form>

        <aside className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white/70">
            <div className="flex items-center gap-2 font-semibold text-[#b5f03c]">
              <ShieldCheck size={16} />
              Fluxo seguro
            </div>
            <p className="mt-2 leading-7">
              Os dados sensiveis do cartao ficam no iframe do Mercado Pago. O frontend envia apenas o token gerado para o backend concluir a assinatura.
            </p>
          </div>

          {!resolvedStudentId ? (
            <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-100">
              Nao foi possivel resolver automaticamente o identificador do aluno. O backend pode rejeitar a assinatura se exigir aluno_id.
            </div>
          ) : null}

          {shouldShowRecurringPlanWarning ? (
            <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-100">
              {missingRecurringPlanWarning}
            </div>
          ) : null}

          {effectiveFeedback ? (
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

          {effectiveState === "loading" ? (
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm text-white/65">
              <Loader2 className="animate-spin text-[#b5f03c]" size={16} />
              Carregando formulario seguro do Mercado Pago...
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
