import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  CircleDollarSign,
  Dumbbell,
  Loader2,
  MessageSquare,
  Send,
  Sparkles,
} from "lucide-react";
import {
  formatDate,
  getMyStudentProfile,
  listMyMessages,
  sendMyMessage,
} from "../lib/api.js";
import { getBillingStatus } from "../lib/billingStatus.js";
import { useTenant } from "../contexts/TenantContext.jsx";

function parseForwardMessage(content) {
  if (typeof content !== "string" || !content.startsWith("__FORWARD__:")) {
    return null;
  }

  try {
    const parsed = JSON.parse(content.slice("__FORWARD__:".length));
    if (!parsed || (parsed.kind !== "workout" && parsed.kind !== "diet")) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function WorkoutCard({ workout }) {
  return (
    <article className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-white/40">
            Treino
          </p>
          <h3 className="mt-2 font-title text-2xl text-[#b5f03c]">
            {workout.title}
          </h3>
          <p className="mt-2 text-sm text-white/62">
            {workout.objective || "Objetivo definido pelo personal."}
          </p>
        </div>
        <Dumbbell className="text-[#b5f03c]" />
      </div>

      <div className="mt-5 space-y-3">
        {(workout.items || []).map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/70"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-white">
                {item.exerciseName}
              </span>
              <span>
                {item.sets}x{item.reps}
              </span>
            </div>
            <p className="mt-1 text-white/50">
              Descanso: {item.restSeconds ? `${item.restSeconds}s` : "livre"}
            </p>
          </div>
        ))}
      </div>
    </article>
  );
}

export default function ClientDashboardPage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const { tenantId } = useTenant();

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      setLoading(true);
      try {
        const result = await getMyStudentProfile(tenantId);
        if (!cancelled) {
          setProfile(result);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(error?.message || "Nao foi possivel carregar seu perfil");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    if (tenantId) {
      loadProfile();
    }

    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const workoutPlans = useMemo(() => profile?.workoutPlans || [], [profile]);
  const activePlan = profile?.alunoPlan || null;
  const billingStatus = useMemo(() => getBillingStatus(profile), [profile]);

  const scheduleEntries = useMemo(() => {
    return workoutPlans.slice(0, 5).map((workout, index) => ({
      id: workout.id,
      label: workout.title,
      date: formatDate(workout.createdAt),
      time: `${8 + index}:00`,
    }));
  }, [workoutPlans]);

  return (
    <main className="space-y-6">
      <section className="rounded-4xl border border-white/10 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.2),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
        <p className="text-xs uppercase tracking-[0.28em] text-white/40">
          Area do aluno
        </p>
        <h1 className="mt-2 font-title text-4xl text-[#d4f7a0]">
          Seu plano, seus treinos e sua rotina
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-white/68">
          Aqui voce acompanha o plano ativo, os treinos liberados pelo personal
          e uma agenda simples baseada nas rotinas cadastradas.
        </p>
      </section>

      {message ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
          {message}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-white/65">
          <Loader2 className="animate-spin text-[#b5f03c]" size={18} />
          Carregando seu perfil...
        </div>
      ) : null}

      {profile ? (
        <>
          <section className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
            <article className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-white/40">
                    Plano contratado
                  </p>
                  <h2 className="mt-2 font-title text-3xl text-[#b5f03c]">
                    {activePlan?.name || "Sem plano ativo"}
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-white/68">
                    {activePlan?.description ||
                      "Selecione um plano publico para iniciar."}
                  </p>
                </div>
                <Sparkles className="text-[#b5f03c]" />
              </div>

              <div
                className={`mt-5 rounded-2xl border px-4 py-4 ${billingStatus.cardClass}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                      Mensalidade
                    </p>
                    <p
                      className={`mt-2 text-lg font-semibold ${billingStatus.accentClass}`}
                    >
                      {billingStatus.label}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/68">
                      {billingStatus.detail}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${billingStatus.badgeClass}`}
                  >
                    {billingStatus.shortLabel}
                  </span>
                </div>
              </div>
            </article>

            <article className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-white/40">
                    Agenda
                  </p>
                  <h2 className="mt-2 font-title text-2xl text-[#b5f03c]">
                    Proximas rotinas
                  </h2>
                </div>
                <CalendarDays className="text-[#b5f03c]" />
              </div>

              <div className="mt-5 space-y-3">
                {scheduleEntries.length === 0 ? (
                  <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-sm text-white/65">
                    Nenhuma rotina liberada ainda.
                  </p>
                ) : (
                  scheduleEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-sm text-white/70"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-white">
                          {entry.label}
                        </span>
                        <span>{entry.time}</span>
                      </div>
                      <p className="mt-1 text-white/50">
                        Criado em {entry.date}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </article>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <article
              className={`rounded-[1.5rem] border p-5 ${billingStatus.cardClass}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                    Status atual
                  </p>
                  <p
                    className={`mt-2 font-title text-2xl ${billingStatus.accentClass}`}
                  >
                    {billingStatus.shortLabel}
                  </p>
                </div>
                <CircleDollarSign className={billingStatus.accentClass} />
              </div>
            </article>

            <article className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                Plano
              </p>
              <p className="mt-2 font-title text-2xl text-[#b5f03c]">
                {activePlan?.name || "Sem plano"}
              </p>
            </article>

            <article className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                Vencimento de referencia
              </p>
              <p className="mt-2 font-title text-2xl text-white">
                {profile?.planDueDate
                  ? formatDate(profile.planDueDate)
                  : "Nao informado"}
              </p>
            </article>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            {workoutPlans.length === 0 ? (
              <div className="rounded-[1.75rem] border border-white/10 bg-white/5 px-4 py-8 text-sm text-white/65">
                Nenhum treino encontrado para o seu perfil.
              </div>
            ) : (
              workoutPlans.map((workout) => (
                <WorkoutCard key={workout.id} workout={workout} />
              ))
            )}
          </section>
        </>
      ) : null}

      {/* CHAT */}
      <ClientChatPanel />
    </main>
  );
}

function ClientChatPanel() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);

  const loadMessages = async () => {
    try {
      const msgs = await listMyMessages();
      setMessages(msgs);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (!open) {
      clearInterval(pollRef.current);
      return;
    }
    setLoading(true);
    loadMessages().finally(() => setLoading(false));
    pollRef.current = setInterval(loadMessages, 5000);
    return () => clearInterval(pollRef.current);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    const optimistic = {
      id: `opt-${Date.now()}`,
      senderRole: "ALUNO",
      content: text.trim(),
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setText("");
    try {
      const msg = await sendMyMessage(optimistic.content);
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? msg : m)),
      );
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="rounded-2xl border border-white/[0.07] overflow-hidden">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-6 py-4 bg-white/[0.03] hover:bg-white/[0.05] transition"
      >
        <div className="flex items-center gap-3">
          <MessageSquare size={16} className="text-[#b5f03c]" />
          <span className="text-sm font-bold text-white/70">
            Mensagens com o Personal
          </span>
        </div>
        <span className="text-xs text-white/30">
          {open ? "Fechar" : "Abrir"}
        </span>
      </button>

      {open && (
        <div className="flex flex-col bg-[#080808]" style={{ height: 400 }}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {loading && messages.length === 0 ? (
              <div className="flex justify-center py-8">
                <Loader2 size={18} className="animate-spin text-white/20" />
              </div>
            ) : messages.length === 0 ? (
              <p className="text-center text-xs text-white/25 pt-10">
                Nenhuma mensagem ainda. Mande um oi pro seu personal!
              </p>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderRole === "ALUNO";
                const forwarded = parseForwardMessage(msg.content);
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-6 ${
                        isMe
                          ? "bg-[#b5f03c] text-black rounded-br-sm"
                          : "bg-white/[0.07] text-white/85 rounded-bl-sm"
                      }`}
                    >
                      {forwarded ? (
                        <div>
                          <p
                            className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isMe ? "text-black/60" : "text-[#b5f03c]"}`}
                          >
                            {forwarded.kind === "workout"
                              ? "Treino encaminhado"
                              : "Dieta encaminhada"}
                          </p>
                          <p className="mt-1 font-semibold">
                            {forwarded.title || "Item"}
                          </p>
                          {forwarded.description ? (
                            <p
                              className={`mt-1 text-xs ${isMe ? "text-black/70" : "text-white/60"}`}
                            >
                              {forwarded.description}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <p>{msg.content}</p>
                      )}
                      <p
                        className={`mt-1 text-[10px] ${isMe ? "text-black/50" : "text-white/30"}`}
                      >
                        {new Date(msg.createdAt).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-white/[0.07] px-4 py-3 flex items-end gap-3">
            <textarea
              rows={1}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Digite uma mensagem..."
              className="flex-1 resize-none rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm text-white placeholder-white/25 focus:border-[#b5f03c]/40 focus:outline-none"
              style={{ maxHeight: 100 }}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!text.trim() || sending}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#b5f03c] text-black transition hover:brightness-110 disabled:opacity-40"
            >
              {sending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
