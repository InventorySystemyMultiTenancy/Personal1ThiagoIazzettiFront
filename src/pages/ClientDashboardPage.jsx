import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CircleDollarSign, Dumbbell, Loader2, Sparkles } from "lucide-react";
import { formatDate, getMyStudentProfile } from "../lib/api.js";
import { getBillingStatus } from "../lib/billingStatus.js";
import { useTenant } from "../contexts/TenantContext.jsx";

function WorkoutCard({ workout }) {
  return (
    <article className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-white/40">
            Treino
          </p>
          <h3 className="mt-2 font-title text-2xl text-[#d9c179]">
            {workout.title}
          </h3>
          <p className="mt-2 text-sm text-white/62">
            {workout.objective || "Objetivo definido pelo personal."}
          </p>
        </div>
        <Dumbbell className="text-[#d9b341]" />
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
        <h1 className="mt-2 font-title text-4xl text-[#f2e3b3]">
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
          <Loader2 className="animate-spin text-[#d9b341]" size={18} />
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
                  <h2 className="mt-2 font-title text-3xl text-[#d9c179]">
                    {activePlan?.name || "Sem plano ativo"}
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-white/68">
                    {activePlan?.description ||
                      "Selecione um plano publico para iniciar."}
                  </p>
                </div>
                <Sparkles className="text-[#d9b341]" />
              </div>

              <div className={`mt-5 rounded-2xl border px-4 py-4 ${billingStatus.cardClass}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                      Mensalidade
                    </p>
                    <p className={`mt-2 text-lg font-semibold ${billingStatus.accentClass}`}>
                      {billingStatus.label}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/68">
                      {billingStatus.detail}
                    </p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${billingStatus.badgeClass}`}>
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
                  <h2 className="mt-2 font-title text-2xl text-[#d9c179]">
                    Proximas rotinas
                  </h2>
                </div>
                <CalendarDays className="text-[#d9b341]" />
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
            <article className={`rounded-[1.5rem] border p-5 ${billingStatus.cardClass}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                    Status atual
                  </p>
                  <p className={`mt-2 font-title text-2xl ${billingStatus.accentClass}`}>
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
              <p className="mt-2 font-title text-2xl text-[#d9c179]">
                {activePlan?.name || "Sem plano"}
              </p>
            </article>

            <article className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                Vencimento de referencia
              </p>
              <p className="mt-2 font-title text-2xl text-white">
                {profile?.planDueDate ? formatDate(profile.planDueDate) : "Nao informado"}
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
    </main>
  );
}
