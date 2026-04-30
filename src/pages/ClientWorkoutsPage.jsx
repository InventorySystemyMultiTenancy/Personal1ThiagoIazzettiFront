import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Dumbbell, Loader2 } from "lucide-react";
import { listMyWorkoutPlans } from "../lib/api.js";
import { useTenant } from "../contexts/TenantContext.jsx";

function formatSessionDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Data invalida";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function WorkoutExerciseList({ items }) {
  return (
    <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
      {items.map((item, index) => (
        <div
          key={item.id || `${item.exerciseName}-${index}`}
          className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/70"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-white">{item.exerciseName}</span>
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
  );
}

function WorkoutScheduleList({ schedule, referenceNow }) {
  const upcomingSessions = useMemo(() => {
    return (Array.isArray(schedule) ? schedule : [])
      .filter((session) => {
        const startsAt = new Date(session.startsAt).getTime();
        return Number.isFinite(startsAt) && startsAt >= referenceNow;
      })
      .sort((left, right) => new Date(left.startsAt) - new Date(right.startsAt));
  }, [referenceNow, schedule]);

  return (
    <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-[#d9c179]">
        <CalendarDays size={16} />
        Proximas sessoes
      </div>

      <div className="mt-3 space-y-3">
        {upcomingSessions.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-sm text-white/60">
            Nenhuma sessao agendada para este plano no momento.
          </p>
        ) : (
          upcomingSessions.map((session) => (
            <div
              key={session.id || `${session.title}-${session.startsAt}`}
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-sm text-white/70"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-semibold text-white">{session.title}</p>
                <span className="rounded-full border border-[#d9b341]/30 bg-[#d9b341]/10 px-3 py-1 text-xs font-semibold text-[#d9c179]">
                  {session.type || "TREINO"}
                </span>
              </div>
              <p className="mt-2 text-white/55">{formatSessionDate(session.startsAt)}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function ClientWorkoutsPage() {
  const { tenantId } = useTenant();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [referenceNow, setReferenceNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setReferenceNow(Date.now());
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadWorkouts = async () => {
      setLoading(true);
      setMessage("");

      try {
        const result = await listMyWorkoutPlans(tenantId);
        if (!cancelled) {
          setPlans(Array.isArray(result) ? result : []);
        }
      } catch (error) {
        if (!cancelled) {
          setPlans([]);
          setMessage(error?.message || "Nao foi possivel carregar seus treinos.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    if (tenantId) {
      loadWorkouts();
    }

    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  return (
    <main className="space-y-6">
      <section className="rounded-4xl border border-white/10 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.2),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
        <p className="text-xs uppercase tracking-[0.28em] text-white/40">
          Area do aluno
        </p>
        <h1 className="mt-2 font-title text-4xl text-[#f2e3b3]">
          Seus planos e sessoes de treino
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-white/68">
          Aqui voce acompanha os planos ativos criados pelo seu personal e as proximas sessoes agendadas para a sua rotina.
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
          Carregando treinos e agenda...
        </div>
      ) : null}

      {!loading && plans.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-8 text-sm text-white/65">
          Nenhum plano de treino encontrado para o seu perfil.
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-2">
        {plans.map((plan) => {
          const items = Array.isArray(plan.items) ? plan.items : [];
          const schedule = Array.isArray(plan.schedule) ? plan.schedule : [];

          return (
            <article
              key={plan.id}
              className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-white/40">
                    Plano de treino
                  </p>
                  <h2 className="mt-2 font-title text-3xl text-[#d9c179]">
                    {plan.title}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-white/68">
                    {plan.objective || "Objetivo definido pelo personal."}
                  </p>
                </div>
                <Dumbbell className="text-[#d9b341]" />
              </div>

              <div className="mt-4 flex flex-wrap gap-3 text-xs text-white/55">
                <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1">
                  {items.length} exercicio(s)
                </span>
                <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1">
                  {schedule.length} sessao(oes)
                </span>
                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-emerald-100">
                  {plan.isActive === false ? "Inativo" : "Ativo"}
                </span>
              </div>

              <WorkoutExerciseList items={items} />
              <WorkoutScheduleList schedule={schedule} referenceNow={referenceNow} />
            </article>
          );
        })}
      </section>
    </main>
  );
}
