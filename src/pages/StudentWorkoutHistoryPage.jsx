import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Dumbbell,
} from "lucide-react";
import { listStudents, listWorkoutSessions } from "../lib/api.js";
import { useTenant } from "../contexts/TenantContext.jsx";

function formatDuration(secondsValue) {
  const total = Number(secondsValue || 0);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export default function StudentWorkoutHistoryPage() {
  const { studentId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { tenantId } = useTenant();

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [studentName, setStudentName] = useState(
    location.state?.studentName || "Aluno",
  );
  const [sessions, setSessions] = useState([]);
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => new Date());

  const monthRange = useMemo(() => {
    const first = new Date(
      monthCursor.getFullYear(),
      monthCursor.getMonth(),
      1,
    );
    const last = new Date(
      monthCursor.getFullYear(),
      monthCursor.getMonth() + 1,
      0,
    );
    return { first, last };
  }, [monthCursor]);

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("pt-BR", {
        month: "long",
        year: "numeric",
      }).format(monthCursor),
    [monthCursor],
  );

  const calendarDays = useMemo(() => {
    const first = new Date(monthRange.first);
    const firstWeekDay = first.getDay();
    first.setDate(first.getDate() - firstWeekDay);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(first);
      d.setDate(first.getDate() + i);
      return d;
    });
  }, [monthRange]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!tenantId || !studentId) return;
      setLoading(true);
      setMessage("");

      try {
        const [students, sessionsData] = await Promise.all([
          listStudents(tenantId),
          listWorkoutSessions(tenantId, {
            alunoId: studentId,
            from: new Date(
              monthRange.first.getFullYear(),
              monthRange.first.getMonth(),
              1,
              0,
              0,
              0,
            ).toISOString(),
            to: new Date(
              monthRange.first.getFullYear(),
              monthRange.first.getMonth() + 1,
              31,
              23,
              59,
              59,
            ).toISOString(),
          }),
        ]);

        if (cancelled) return;

        const found = (Array.isArray(students) ? students : []).find(
          (student) => student.id === studentId,
        );
        if (found?.fullName) {
          setStudentName(found.fullName);
        }

        const onlyFinished = (
          Array.isArray(sessionsData) ? sessionsData : []
        ).filter((session) => session.finishedAt);
        setSessions(onlyFinished);
      } catch (error) {
        if (!cancelled) {
          setSessions([]);
          setMessage(
            error?.message || "Nao foi possivel carregar historico de treinos.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [tenantId, studentId, monthRange.first]);

  const sessionsByDay = useMemo(() => {
    const map = new Map();
    sessions.forEach((session) => {
      const key = new Date(session.startedAt).toDateString();
      const current = map.get(key) || [];
      current.push(session);
      map.set(key, current);
    });
    return map;
  }, [sessions]);

  const selectedDaySessions = useMemo(() => {
    const key = selectedDay.toDateString();
    const list = sessionsByDay.get(key) || [];
    return list
      .slice()
      .sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));
  }, [selectedDay, sessionsByDay]);

  return (
    <main className="space-y-6">
      <section className="rounded-[1.75rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(181,240,60,0.15),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6">
        <button
          type="button"
          onClick={() => navigate("/admin/alunos")}
          className="mb-4 inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/70 transition hover:border-white/20"
        >
          <ChevronLeft size={14} />
          Voltar para alunos
        </button>
        <p className="text-xs uppercase tracking-[0.28em] text-white/40">
          Historico de treino
        </p>
        <h1 className="mt-2 font-title text-4xl text-[#d4f7a0]">
          {studentName}
        </h1>
        <p className="mt-3 text-sm text-white/68">
          Calendario com sessoes finalizadas, tempo gasto e cargas por
          exercicio.
        </p>
      </section>

      {message ? (
        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {message}
        </div>
      ) : null}

      <section className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-4 md:p-6">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() =>
              setMonthCursor(
                (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
              )
            }
            className="rounded-lg border border-white/15 p-2 text-white/70"
          >
            <ChevronLeft size={16} />
          </button>
          <h2 className="font-title text-2xl capitalize text-[#b5f03c]">
            {monthLabel}
          </h2>
          <button
            type="button"
            onClick={() =>
              setMonthCursor(
                (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
              )
            }
            className="rounded-lg border border-white/15 p-2 text-white/70"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center text-xs uppercase tracking-[0.08em] text-white/45">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"].map((label) => (
            <div key={label}>{label}</div>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-7 gap-2">
          {calendarDays.map((day) => {
            const key = day.toDateString();
            const daySessions = sessionsByDay.get(key) || [];
            const inMonth = day.getMonth() === monthRange.first.getMonth();
            const dayTotalSeconds = daySessions.reduce(
              (total, session) => total + Number(session.durationSeconds || 0),
              0,
            );

            return (
              <div
                key={key}
                onClick={() => setSelectedDay(day)}
                className={`min-h-28 cursor-pointer rounded-xl border p-2 ${inMonth ? "border-white/15 bg-black/25" : "border-white/5 bg-black/10"}`}
              >
                <p
                  className={`text-xs ${inMonth ? "text-white/75" : "text-white/30"}`}
                >
                  {day.getDate()}
                </p>
                <div className="mt-1 space-y-1">
                  {daySessions.slice(0, 2).map((session) => (
                    <div
                      key={session.id}
                      className="rounded-md border border-white/10 bg-white/5 px-1.5 py-1 text-[10px] text-white/80"
                    >
                      <p className="font-semibold">
                        {session.workoutPlan?.title || "Treino"}
                      </p>
                      <p className="text-white/60">
                        {formatDuration(session.durationSeconds)}
                      </p>
                    </div>
                  ))}
                  {daySessions.length > 2 ? (
                    <p className="text-[10px] text-white/55">
                      +{daySessions.length - 2} sessoes
                    </p>
                  ) : null}
                  {daySessions.length > 0 ? (
                    <p className="text-[10px] text-emerald-200">
                      Total: {formatDuration(dayTotalSeconds)}
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6">
        <h2 className="font-title text-2xl text-[#b5f03c]">
          Sessoes do dia ({selectedDay.toLocaleDateString("pt-BR")})
        </h2>

        {loading ? (
          <p className="mt-4 text-sm text-white/60">Carregando...</p>
        ) : selectedDaySessions.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-sm text-white/60">
            Nenhum treino finalizado neste dia.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {selectedDaySessions.map((session) => (
              <article
                key={session.id}
                className="rounded-2xl border border-white/10 bg-black/30 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-white">
                    {session.workoutPlan?.title || "Treino"}
                  </p>
                  <span className="rounded-full border border-[#b5f03c]/30 bg-[#b5f03c]/10 px-3 py-1 text-xs font-semibold text-[#b5f03c]">
                    {formatDuration(session.durationSeconds)}
                  </span>
                </div>

                <div className="mt-2 grid gap-2 text-sm md:grid-cols-2">
                  <p className="flex items-center gap-2 text-white/65">
                    <Clock3 size={14} className="text-white/45" />
                    Inicio: {formatDateTime(session.startedAt)}
                  </p>
                  <p className="flex items-center gap-2 text-white/65">
                    <CalendarDays size={14} className="text-white/45" />
                    Fim: {formatDateTime(session.finishedAt)}
                  </p>
                </div>

                <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                  {(session.items || []).length === 0 ? (
                    <p className="text-sm text-white/55">
                      Sem exercicios registrados nesta sessao.
                    </p>
                  ) : (
                    (session.items || []).map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75"
                      >
                        <p className="font-semibold text-white flex items-center gap-2">
                          <Dumbbell size={14} className="text-white/45" />
                          {item.exerciseName}
                        </p>
                        <p className="text-white/60">
                          Cargas: {item.loadNotes || "-"}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
