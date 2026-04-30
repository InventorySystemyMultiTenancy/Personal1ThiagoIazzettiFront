import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Dumbbell,
  Salad,
  Save,
  User,
} from "lucide-react";
import {
  createAgendaEvent,
  deleteAgendaEvent,
  listAgendaEvents,
  listStudents,
  listWorkoutPlans,
  updateAgendaEvent,
} from "../lib/api.js";
import { useTenant } from "../contexts/TenantContext.jsx";

function eventTone(type) {
  if (type === "TREINO")
    return "border-[#b5f03c]/45 bg-[#b5f03c]/12 text-[#d4f7a0]";
  if (type === "DIETA")
    return "border-emerald-400/45 bg-emerald-500/12 text-emerald-200";
  if (type === "CONSULTA")
    return "border-sky-400/45 bg-sky-500/12 text-sky-200";
  if (type === "CHECKIN")
    return "border-violet-400/45 bg-violet-500/12 text-violet-200";
  return "border-white/20 bg-white/10 text-white/75";
}

function attendanceTone(status) {
  if (status === "CONFIRMADO")
    return "border-emerald-400/40 bg-emerald-500/15 text-emerald-200";
  if (status === "FALTOU")
    return "border-red-400/40 bg-red-500/15 text-red-200";
  return "border-amber-300/40 bg-amber-400/10 text-amber-100";
}

function toInputDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (v) => String(v).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function AdminAgendaPage() {
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [students, setStudents] = useState([]);
  const [events, setEvents] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [editingId, setEditingId] = useState("");
  const [monthCursor, setMonthCursor] = useState(() => new Date());

  const [form, setForm] = useState({
    alunoId: "",
    title: "",
    description: "",
    type: "TREINO",
    startsAt: "",
    endsAt: "",
    workoutPlanId: "",
    dietNotes: "",
    recurrence: "NONE",
    recurrenceUntil: "",
    attendanceStatus: "PENDENTE",
  });

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === form.alunoId) || null,
    [students, form.alunoId],
  );

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("pt-BR", {
        month: "long",
        year: "numeric",
      }).format(monthCursor),
    [monthCursor],
  );

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

  const loadEvents = async (alunoId) => {
    const data = await listAgendaEvents(tenantId, {
      alunoId: alunoId || undefined,
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
    });
    setEvents(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setMessage("");
      try {
        const allStudents = await listStudents(tenantId);
        if (cancelled) return;
        const normalizedStudents = Array.isArray(allStudents)
          ? allStudents
          : [];
        setStudents(normalizedStudents);

        const firstId = normalizedStudents[0]?.id || "";
        if (firstId) {
          setForm((prev) => ({ ...prev, alunoId: prev.alunoId || firstId }));
          const [allEvents, studentWorkouts] = await Promise.all([
            listAgendaEvents(tenantId, {
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
            listWorkoutPlans(firstId, tenantId),
          ]);
          if (cancelled) return;
          setEvents(Array.isArray(allEvents) ? allEvents : []);
          setWorkouts(Array.isArray(studentWorkouts) ? studentWorkouts : []);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(error?.message || "Nao foi possivel carregar agenda");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    if (tenantId) load();

    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) return;
    loadEvents(form.alunoId).catch(() => {});
  }, [monthRange.first.getMonth(), monthRange.first.getFullYear()]);

  useEffect(() => {
    let cancelled = false;

    const loadByStudent = async () => {
      if (!form.alunoId) {
        setWorkouts([]);
        return;
      }

      try {
        const [studentWorkouts, studentEvents] = await Promise.all([
          listWorkoutPlans(form.alunoId, tenantId),
          listAgendaEvents(tenantId, {
            alunoId: form.alunoId,
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
        if (!cancelled) {
          setWorkouts(Array.isArray(studentWorkouts) ? studentWorkouts : []);
          setEvents(Array.isArray(studentEvents) ? studentEvents : []);
        }
      } catch (_error) {
        if (!cancelled) {
          setWorkouts([]);
        }
      }
    };

    if (tenantId) loadByStudent();

    return () => {
      cancelled = true;
    };
  }, [form.alunoId, tenantId]);

  const resetForm = () => {
    setEditingId("");
    setForm((prev) => ({
      ...prev,
      title: "",
      description: "",
      startsAt: "",
      endsAt: "",
      workoutPlanId: "",
      dietNotes: "",
      type: "TREINO",
      recurrence: "NONE",
      recurrenceUntil: "",
      attendanceStatus: "PENDENTE",
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!form.alunoId || !form.title.trim() || !form.startsAt) {
      setMessage("Aluno, titulo e horario inicial sao obrigatorios");
      return;
    }

    const payload = {
      alunoId: form.alunoId,
      title: form.title.trim(),
      description: form.description || null,
      type: form.type,
      startsAt: form.startsAt,
      endsAt: form.endsAt || null,
      workoutPlanId: form.workoutPlanId || null,
      dietNotes: form.dietNotes || null,
      recurrence: form.recurrence,
      recurrenceUntil: form.recurrenceUntil || null,
      attendanceStatus: form.attendanceStatus,
    };

    try {
      if (editingId) {
        const updated = await updateAgendaEvent(editingId, payload, tenantId);
        setEvents((prev) =>
          prev.map((ev) => (ev.id === editingId ? updated : ev)),
        );
        setMessage("Evento atualizado com sucesso");
      } else {
        await createAgendaEvent(payload, tenantId);
        setMessage("Evento criado com sucesso");
      }
      resetForm();
      await loadEvents(form.alunoId);
    } catch (error) {
      setMessage(error?.message || "Falha ao salvar evento");
    }
  };

  const handleEdit = (event) => {
    setEditingId(event.id);
    setForm({
      alunoId: event.alunoId || "",
      title: event.title || "",
      description: event.description || "",
      type: event.type || "OUTRO",
      startsAt: toInputDateTime(event.startsAt),
      endsAt: toInputDateTime(event.endsAt),
      workoutPlanId: event.workoutPlanId || "",
      dietNotes: event.dietNotes || "",
      recurrence: event.recurrence || "NONE",
      recurrenceUntil: event.recurrenceUntil
        ? toInputDateTime(event.recurrenceUntil)
        : "",
      attendanceStatus: event.attendanceStatus || "PENDENTE",
    });
  };

  const handleDelete = async (eventId) => {
    const ok = window.confirm("Excluir este evento da agenda?");
    if (!ok) return;
    try {
      await deleteAgendaEvent(eventId, tenantId);
      setEvents((prev) => prev.filter((ev) => ev.id !== eventId));
      setMessage("Evento removido");
    } catch (error) {
      setMessage(error?.message || "Nao foi possivel excluir evento");
    }
  };

  const eventsByDay = useMemo(() => {
    const map = new Map();
    events.forEach((event) => {
      const key = new Date(event.startsAt).toDateString();
      const arr = map.get(key) || [];
      arr.push(event);
      map.set(key, arr);
    });
    return map;
  }, [events]);

  return (
    <main className="space-y-6">
      <section className="rounded-[1.75rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.2),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-white/40">
              Agenda
            </p>
            <h1 className="mt-2 font-title text-4xl text-[#d4f7a0]">
              Agenda do Personal
            </h1>
            <p className="mt-3 text-sm text-white/68">
              Calendario mensal, recorrencia semanal/mensal e presenca do aluno.
            </p>
          </div>
          <CalendarDays className="text-[#b5f03c]" size={28} />
        </div>
      </section>

      {message ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/75">
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
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-2">
          {calendarDays.map((day) => {
            const key = day.toDateString();
            const dayEvents = eventsByDay.get(key) || [];
            const inMonth = day.getMonth() === monthRange.first.getMonth();
            return (
              <div
                key={key}
                className={`min-h-28 rounded-xl border p-2 ${inMonth ? "border-white/15 bg-black/25" : "border-white/5 bg-black/10"}`}
              >
                <p
                  className={`text-xs ${inMonth ? "text-white/75" : "text-white/30"}`}
                >
                  {day.getDate()}
                </p>
                <div className="mt-1 space-y-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      className="rounded-md border border-white/10 bg-white/5 px-1.5 py-1 text-[10px] text-white/80"
                    >
                      {new Date(event.startsAt).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 ? (
                    <p className="text-[10px] text-white/55">
                      +{dayEvents.length - 3} eventos
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <article className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6">
          <h2 className="font-title text-2xl text-[#b5f03c]">
            {editingId ? "Editar evento" : "Novo evento"}
          </h2>
          <form className="mt-5 space-y-4" onSubmit={handleSave}>
            <label className="block text-sm text-white/70">
              Aluno
              <select
                value={form.alunoId}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, alunoId: e.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none"
              >
                <option value="">Selecione</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.fullName}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-sm text-white/70">
                Tipo
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, type: e.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none"
                >
                  <option value="TREINO">Treino</option>
                  <option value="DIETA">Dieta</option>
                  <option value="CONSULTA">Consulta</option>
                  <option value="CHECKIN">Check-in</option>
                  <option value="OUTRO">Outro</option>
                </select>
              </label>
              <label className="block text-sm text-white/70">
                Presenca
                <select
                  value={form.attendanceStatus}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      attendanceStatus: e.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none"
                >
                  <option value="PENDENTE">Pendente</option>
                  <option value="CONFIRMADO">Confirmado</option>
                  <option value="FALTOU">Faltou</option>
                </select>
              </label>
            </div>
            <label className="block text-sm text-white/70">
              Titulo
              <input
                value={form.title}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, title: e.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none"
              />
            </label>
            <label className="block text-sm text-white/70">
              Descricao
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none"
              />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-sm text-white/70">
                Inicio
                <input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, startsAt: e.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none"
                />
              </label>
              <label className="block text-sm text-white/70">
                Fim
                <input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, endsAt: e.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none"
                />
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-sm text-white/70">
                Recorrencia
                <select
                  value={form.recurrence}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, recurrence: e.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none"
                >
                  <option value="NONE">Nao repetir</option>
                  <option value="WEEKLY">Semanal</option>
                  <option value="MONTHLY">Mensal</option>
                </select>
              </label>
              <label className="block text-sm text-white/70">
                Repetir ate
                <input
                  type="datetime-local"
                  value={form.recurrenceUntil}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      recurrenceUntil: e.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none"
                  disabled={form.recurrence === "NONE"}
                />
              </label>
            </div>
            <label className="block text-sm text-white/70">
              Treino relacionado
              <select
                value={form.workoutPlanId}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    workoutPlanId: e.target.value,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none"
              >
                <option value="">Sem treino vinculado</option>
                {workouts.map((workout) => (
                  <option key={workout.id} value={workout.id}>
                    {workout.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-white/70">
              Dieta / orientacoes
              <textarea
                rows={3}
                value={form.dietNotes}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, dietNotes: e.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-[#b5f03c] px-5 py-3 font-semibold text-black"
              >
                <Save size={16} />
                {editingId ? "Salvar alteracoes" : "Criar evento"}
              </button>
              {editingId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-white/15 px-5 py-3 text-sm text-white/70"
                >
                  Cancelar
                </button>
              ) : null}
            </div>
          </form>
        </article>

        <article className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6">
          <h2 className="font-title text-2xl text-[#b5f03c]">
            Eventos ({events.length})
          </h2>
          <p className="mt-2 text-sm text-white/60">
            {selectedStudent
              ? `Aluno selecionado: ${selectedStudent.fullName}`
              : "Mostrando agenda geral"}
          </p>
          <div className="mt-5 space-y-3">
            {loading ? (
              <p className="text-sm text-white/60">Carregando...</p>
            ) : events.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-black/30 px-4 py-5 text-sm text-white/65">
                Nenhum evento cadastrado.
              </p>
            ) : (
              events.map((event) => (
                <div
                  key={event.id}
                  className="rounded-2xl border border-white/10 bg-black/30 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${eventTone(event.type)}`}
                      >
                        {event.type}
                      </span>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${attendanceTone(event.attendanceStatus)}`}
                      >
                        {event.attendanceStatus}
                      </span>
                      <p className="font-semibold text-white">{event.title}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(event)}
                        className="rounded-lg border border-white/10 px-3 py-1 text-xs text-white/70 hover:text-white"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(event.id)}
                        className="rounded-lg border border-red-400/30 px-3 py-1 text-xs text-red-200"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                    <div className="flex items-center gap-2 text-white/75">
                      <User size={14} className="text-white/45" />
                      <span>{event.aluno?.fullName || "Aluno"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/75">
                      <Clock3 size={14} className="text-white/45" />
                      <span>
                        {formatDateTime(event.startsAt)}{" "}
                        {event.endsAt
                          ? `- ${formatDateTime(event.endsAt)}`
                          : ""}
                      </span>
                    </div>
                    {event.workoutPlan?.title ? (
                      <div className="flex items-center gap-2 text-white/75">
                        <Dumbbell size={14} className="text-white/45" />
                        <span>{event.workoutPlan.title}</span>
                      </div>
                    ) : null}
                    {event.dietNotes ? (
                      <div className="flex items-center gap-2 text-white/75">
                        <Salad size={14} className="text-white/45" />
                        <span>{event.dietNotes}</span>
                      </div>
                    ) : null}
                  </div>
                  {event.description ? (
                    <p className="mt-2 text-sm text-white/60">
                      {event.description}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
