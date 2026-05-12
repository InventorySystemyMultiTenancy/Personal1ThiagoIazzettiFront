import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Dumbbell, Loader2 } from "lucide-react";
import { listMyWorkoutPlans } from "../lib/api.js";
import { useTenant } from "../contexts/TenantContext.jsx";
import { useI18n } from "../contexts/I18nContext.jsx";

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
  const { t } = useI18n();
  return (
    <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
      {items.map((item, index) => (
        <div
          key={item.id || `${item.exerciseName}-${index}`}
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
            {t("CLIENT_DASH_REST_LABEL_THIAGOIAZZETTI", "Descanso")}:{" "}
            {item.restSeconds
              ? `${item.restSeconds}s`
              : t("CLIENT_DASH_REST_FREE_THIAGOIAZZETTI", "livre")}
          </p>
        </div>
      ))}
    </div>
  );
}

function WorkoutScheduleList({ schedule, referenceNow }) {
  const { t } = useI18n();
  const upcomingSessions = useMemo(() => {
    return (Array.isArray(schedule) ? schedule : [])
      .filter((session) => {
        const startsAt = new Date(session.startsAt).getTime();
        return Number.isFinite(startsAt) && startsAt >= referenceNow;
      })
      .sort(
        (left, right) => new Date(left.startsAt) - new Date(right.startsAt),
      );
  }, [referenceNow, schedule]);

  return (
    <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-[#b5f03c]">
        <CalendarDays size={16} />
        {t("CLIENT_WORKOUTS_UPCOMING_TITLE_THIAGOIAZZETTI", "Proximas sessoes")}
      </div>

      <div className="mt-3 space-y-3">
        {upcomingSessions.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-sm text-white/60">
            {t(
              "CLIENT_WORKOUTS_NO_SESSIONS_THIAGOIAZZETTI",
              "Nenhuma sessao agendada para este plano no momento.",
            )}
          </p>
        ) : (
          upcomingSessions.map((session) => (
            <div
              key={session.id || `${session.title}-${session.startsAt}`}
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-sm text-white/70"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-semibold text-white">{session.title}</p>
                <span className="rounded-full border border-[#b5f03c]/30 bg-[#b5f03c]/10 px-3 py-1 text-xs font-semibold text-[#b5f03c]">
                  {session.type || "TREINO"}
                </span>
              </div>
              <p className="mt-2 text-white/55">
                {formatSessionDate(session.startsAt)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function ClientWorkoutsPage() {
  const { tenantId } = useTenant();
  const { t } = useI18n();
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
          setMessage(
            error?.message ||
              t(
                "CLIENT_WORKOUTS_LOAD_ERROR_THIAGOIAZZETTI",
                "Nao foi possivel carregar seus treinos.",
              ),
          );
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
          {t("CLIENT_DASH_HEADER_BADGE_THIAGOIAZZETTI", "Area do aluno")}
        </p>
        <h1 className="mt-2 font-title text-4xl text-[#d4f7a0]">
          {t(
            "CLIENT_WORKOUTS_HEADER_TITLE_THIAGOIAZZETTI",
            "Seus planos e sessoes de treino",
          )}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-white/68">
          {t(
            "CLIENT_WORKOUTS_HEADER_SUBTITLE_THIAGOIAZZETTI",
            "Aqui voce acompanha os planos ativos criados pelo seu personal e as proximas sessoes agendadas para a sua rotina.",
          )}
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
          {t(
            "CLIENT_WORKOUTS_LOADING_THIAGOIAZZETTI",
            "Carregando treinos e agenda...",
          )}
        </div>
      ) : null}

      {!loading && plans.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-8 text-sm text-white/65">
          {t(
            "CLIENT_WORKOUTS_NO_PLANS_THIAGOIAZZETTI",
            "Nenhum plano de treino encontrado para o seu perfil.",
          )}
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
                    {t(
                      "CLIENT_WORKOUTS_PLAN_BADGE_THIAGOIAZZETTI",
                      "Plano de treino",
                    )}
                  </p>
                  <h2 className="mt-2 font-title text-3xl text-[#b5f03c]">
                    {plan.title}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-white/68">
                    {plan.objective ||
                      t(
                        "CLIENT_DASH_WORKOUT_OBJECTIVE_THIAGOIAZZETTI",
                        "Objetivo definido pelo personal.",
                      )}
                  </p>
                </div>
                <Dumbbell className="text-[#b5f03c]" />
              </div>

              <div className="mt-4 flex flex-wrap gap-3 text-xs text-white/55">
                <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1">
                  {items.length}{" "}
                  {t(
                    "CLIENT_WORKOUTS_EXERCISES_LABEL_THIAGOIAZZETTI",
                    "exercicio(s)",
                  )}
                </span>
                <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1">
                  {schedule.length}{" "}
                  {t(
                    "CLIENT_WORKOUTS_SESSIONS_LABEL_THIAGOIAZZETTI",
                    "sessao(oes)",
                  )}
                </span>
                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-emerald-100">
                  {plan.isActive === false
                    ? t("CLIENT_WORKOUTS_INACTIVE_THIAGOIAZZETTI", "Inativo")
                    : t("CLIENT_WORKOUTS_ACTIVE_THIAGOIAZZETTI", "Ativo")}
                </span>
              </div>

              <WorkoutExerciseList items={items} />
              <WorkoutScheduleList
                schedule={schedule}
                referenceNow={referenceNow}
              />
            </article>
          );
        })}
      </section>
    </main>
  );
}
