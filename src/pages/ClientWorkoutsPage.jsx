import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock3,
  Dumbbell,
  Loader2,
  Play,
  Square,
} from "lucide-react";
import {
  finishWorkoutSession,
  listMyWorkoutPlans,
  listMyWorkoutSessions,
  startWorkoutSession,
} from "../lib/api.js";
import { useTenant } from "../contexts/TenantContext.jsx";
import { useI18n } from "../contexts/I18nContext.jsx";

function formatDuration(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

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

function WorkoutExerciseList({ items, planId, notesByPlan, onLoadNoteChange }) {
  const { t } = useI18n();
  const notesForPlan = notesByPlan?.[planId] || {};

  return (
    <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
      {items.map((item, index) => {
        const noteKey = item.id || `${item.exerciseName}-${index}`;

        return (
          <div
            key={item.id || `${item.exerciseName}-${index}`}
            className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/70"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-white">
                {item.exerciseName}
              </span>
              <div className="flex items-center gap-3">
                <span>
                  {item.sets}x{item.reps}
                </span>
                {item.videoUrl ? (
                  <a
                    href={item.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={t(
                      "CLIENT_WORKOUTS_WATCH_VIDEO_THIAGOIAZZETTI",
                      "Ver video do exercicio",
                    )}
                    className="flex items-center gap-1 rounded-lg border border-[#b5f03c]/40 px-2 py-1 text-xs text-[#b5f03c] transition hover:bg-[#b5f03c]/10"
                  >
                    <Play size={12} />
                    {t("CLIENT_WORKOUTS_VIDEO_LABEL_THIAGOIAZZETTI", "Video")}
                  </a>
                ) : null}
              </div>
            </div>
            <p className="mt-1 text-white/50">
              {t("CLIENT_DASH_REST_LABEL_THIAGOIAZZETTI", "Descanso")}:{" "}
              {item.restSeconds
                ? `${item.restSeconds}s`
                : t("CLIENT_DASH_REST_FREE_THIAGOIAZZETTI", "livre")}
            </p>
            <label className="mt-3 block text-xs text-white/55">
              {t(
                "CLIENT_WORKOUTS_LOAD_NOTES_LABEL_THIAGOIAZZETTI",
                "Anotação de cargas",
              )}
              <input
                type="text"
                value={notesForPlan[noteKey] || ""}
                onChange={(event) =>
                  onLoadNoteChange(planId, noteKey, event.target.value)
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-[#b5f03c]/50"
                placeholder={t(
                  "CLIENT_WORKOUTS_LOAD_NOTES_PLACEHOLDER_THIAGOIAZZETTI",
                  "Ex: 40kg, 35kg, 30kg",
                )}
              />
            </label>
          </div>
        );
      })}
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
        {t("CLIENT_WORKOUTS_UPCOMING_TITLE_THIAGOIAZZETTI", "Próximas sessões")}
      </div>

      <div className="mt-3 space-y-3">
        {upcomingSessions.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-sm text-white/60">
            {t(
              "CLIENT_WORKOUTS_NO_SESSIONS_THIAGOIAZZETTI",
              "Nenhuma sessão agendada para este plano no momento.",
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
  const [activeWorkout, setActiveWorkout] = useState(null);
  const [clockTick, setClockTick] = useState(() => Date.now());
  const [loadNotesByPlan, setLoadNotesByPlan] = useState({});
  const [completedSessionsByPlan, setCompletedSessionsByPlan] = useState({});

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setReferenceNow(Date.now());
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!activeWorkout?.startedAt) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setClockTick(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeWorkout]);

  useEffect(() => {
    let cancelled = false;

    const loadWorkouts = async () => {
      setLoading(true);
      setMessage("");

      try {
        const [result, sessions] = await Promise.all([
          listMyWorkoutPlans(tenantId),
          listMyWorkoutSessions(tenantId),
        ]);
        if (!cancelled) {
          setPlans(Array.isArray(result) ? result : []);

          const grouped = (Array.isArray(sessions) ? sessions : []).reduce(
            (acc, session) => {
              const key = session.workoutPlanId;
              if (!key) {
                return acc;
              }
              acc[key] = acc[key] || [];
              acc[key].push(session);
              return acc;
            },
            {},
          );

          setCompletedSessionsByPlan(grouped);

          const active = (Array.isArray(sessions) ? sessions : []).find(
            (session) => !session.finishedAt,
          );
          setActiveWorkout(
            active
              ? {
                  sessionId: active.id,
                  planId: active.workoutPlanId,
                  title: active.workoutPlan?.title || "",
                  startedAt: new Date(active.startedAt).getTime(),
                }
              : null,
          );

          const initialNotesByPlan = {};
          (Array.isArray(sessions) ? sessions : []).forEach((session) => {
            if (!session.workoutPlanId || !Array.isArray(session.items)) {
              return;
            }
            if (!initialNotesByPlan[session.workoutPlanId]) {
              initialNotesByPlan[session.workoutPlanId] = {};
            }
            session.items.forEach((item, idx) => {
              const key = `${item.exerciseName}-${idx}`;
              if (item.loadNotes) {
                initialNotesByPlan[session.workoutPlanId][key] = item.loadNotes;
              }
            });
          });
          setLoadNotesByPlan(initialNotesByPlan);
        }
      } catch (error) {
        if (!cancelled) {
          setPlans([]);
          setMessage(
            error?.message ||
              t(
                "CLIENT_WORKOUTS_LOAD_ERROR_THIAGOIAZZETTI",
                "Não foi possível carregar seus treinos.",
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

  const handleLoadNoteChange = (planId, noteKey, value) => {
    setLoadNotesByPlan((current) => ({
      ...current,
      [planId]: {
        ...(current[planId] || {}),
        [noteKey]: value,
      },
    }));
  };

  const handleStartWorkout = async (plan) => {
    if (activeWorkout?.planId && activeWorkout.planId !== plan.id) {
      setMessage(
        t(
          "CLIENT_WORKOUTS_ONLY_ONE_ACTIVE_THIAGOIAZZETTI",
          "Finalize o treino em andamento antes de iniciar outro.",
        ),
      );
      return;
    }

    try {
      const started = await startWorkoutSession(
        { workoutPlanId: plan.id },
        tenantId,
      );

      const startedAtMs = new Date(started.startedAt).getTime();
      setActiveWorkout({
        sessionId: started.id,
        planId: plan.id,
        title: plan.title,
        startedAt: Number.isFinite(startedAtMs) ? startedAtMs : Date.now(),
      });
      setClockTick(Date.now());
      setMessage(
        t(
          "CLIENT_WORKOUTS_STARTED_THIAGOIAZZETTI",
          "Treino iniciado. Bom treino!",
        ),
      );
    } catch (error) {
      setMessage(error?.message || "Não foi possível iniciar o treino.");
    }
  };

  const handleFinishWorkout = async (plan, items) => {
    if (!activeWorkout || activeWorkout.planId !== plan.id) {
      return;
    }

    const finishedAt = Date.now();
    const durationMs = Math.max(
      0,
      finishedAt - Number(activeWorkout.startedAt),
    );

    try {
      const payloadItems = (Array.isArray(items) ? items : []).map(
        (item, index) => ({
          exerciseName: item.exerciseName,
          loadNotes:
            loadNotesByPlan?.[plan.id]?.[
              item.id || `${item.exerciseName}-${index}`
            ] || "",
          orderIndex: index,
        }),
      );

      const finished = await finishWorkoutSession(
        {
          sessionId: activeWorkout.sessionId,
          workoutPlanId: plan.id,
          finishedAt: new Date(finishedAt).toISOString(),
          items: payloadItems,
        },
        tenantId,
      );

      setCompletedSessionsByPlan((current) => {
        const sessions = Array.isArray(current[plan.id])
          ? current[plan.id]
          : [];
        const nextSessions = [
          finished,
          ...sessions.filter((s) => s.id !== finished.id),
        ].slice(0, 10);

        return {
          ...current,
          [plan.id]: nextSessions,
        };
      });

      setActiveWorkout(null);
      setMessage(
        `${t("CLIENT_WORKOUTS_FINISHED_THIAGOIAZZETTI", "Treino finalizado em")} ${formatDuration(durationMs)}.`,
      );
    } catch (error) {
      setMessage(error?.message || "Não foi possível finalizar o treino.");
    }
  };

  return (
    <main className="space-y-6">
      <section className="rounded-4xl border border-white/10 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.2),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
        <p className="text-xs uppercase tracking-[0.28em] text-white/40">
          {t("CLIENT_DASH_HEADER_BADGE_THIAGOIAZZETTI", "Área do aluno")}
        </p>
        <h1 className="mt-2 font-title text-4xl text-[#d4f7a0]">
          {t(
            "CLIENT_WORKOUTS_HEADER_TITLE_THIAGOIAZZETTI",
            "Seus planos e sessões de treino",
          )}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-white/68">
          {t(
            "CLIENT_WORKOUTS_HEADER_SUBTITLE_THIAGOIAZZETTI",
            "Aqui você acompanha os planos ativos criados pelo seu personal e as próximas sessões agendadas para a sua rotina.",
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
          const isRunning = activeWorkout?.planId === plan.id;
          const elapsedMs = isRunning
            ? Math.max(0, clockTick - Number(activeWorkout.startedAt || 0))
            : 0;
          const latestCompleted = Array.isArray(
            completedSessionsByPlan[plan.id],
          )
            ? completedSessionsByPlan[plan.id].find(
                (session) => session?.finishedAt,
              )
            : null;

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
                    "sessão(oes)",
                  )}
                </span>
                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-emerald-100">
                  {plan.isActive === false
                    ? t("CLIENT_WORKOUTS_INACTIVE_THIAGOIAZZETTI", "Inativo")
                    : t("CLIENT_WORKOUTS_ACTIVE_THIAGOIAZZETTI", "Ativo")}
                </span>
                {isRunning ? (
                  <span className="rounded-full border border-[#b5f03c]/30 bg-[#b5f03c]/10 px-3 py-1 text-[#b5f03c]">
                    {t(
                      "CLIENT_WORKOUTS_RUNNING_THIAGOIAZZETTI",
                      "Em andamento",
                    )}
                  </span>
                ) : null}
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <Clock3 size={16} className="text-[#b5f03c]" />
                    {isRunning
                      ? t(
                          "CLIENT_WORKOUTS_ELAPSED_TIME_THIAGOIAZZETTI",
                          "Tempo decorrido",
                        )
                      : t(
                          "CLIENT_WORKOUTS_LAST_DURATION_THIAGOIAZZETTI",
                          "Última duração",
                        )}
                    :
                    <span className="font-semibold text-white">
                      {isRunning
                        ? formatDuration(elapsedMs)
                        : latestCompleted
                          ? formatDuration(
                              (latestCompleted.durationSeconds || 0) * 1000,
                            )
                          : "--:--:--"}
                    </span>
                  </div>

                  {isRunning ? (
                    <button
                      type="button"
                      onClick={() => handleFinishWorkout(plan, items)}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-400/20"
                    >
                      <Square size={14} />
                      {t(
                        "CLIENT_WORKOUTS_FINISH_BTN_THIAGOIAZZETTI",
                        "Finalizar treino",
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleStartWorkout(plan)}
                      className="inline-flex items-center gap-2 rounded-xl border border-[#b5f03c]/50 bg-[#b5f03c]/10 px-4 py-2 text-sm font-semibold text-[#b5f03c] transition hover:bg-[#b5f03c]/20"
                    >
                      <Play size={14} />
                      {t(
                        "CLIENT_WORKOUTS_START_BTN_THIAGOIAZZETTI",
                        "Iniciar treino",
                      )}
                    </button>
                  )}
                </div>
              </div>

              <WorkoutExerciseList
                items={items}
                planId={plan.id}
                notesByPlan={loadNotesByPlan}
                onLoadNoteChange={handleLoadNoteChange}
              />
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
