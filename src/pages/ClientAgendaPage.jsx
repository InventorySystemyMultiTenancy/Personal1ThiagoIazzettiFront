import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Dumbbell,
  Salad,
} from "lucide-react";
import { confirmAgendaAttendance, listMyAgendaEvents } from "../lib/api.js";
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

function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

function attendanceTone(status) {
  if (status === "CONFIRMADO")
    return "border-emerald-400/40 bg-emerald-500/15 text-emerald-200";
  if (status === "FALTOU")
    return "border-red-400/40 bg-red-500/15 text-red-200";
  return "border-amber-300/40 bg-amber-400/10 text-amber-100";
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function ClientAgendaPage() {
  const { tenantId } = useTenant();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [monthCursor, setMonthCursor] = useState(() => new Date());

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
      setLoading(true);
      setMessage("");
      try {
        const data = await listMyAgendaEvents(tenantId);
        if (!cancelled) {
          const list = Array.isArray(data) ? data : [];
          const filtered = list.filter((event) => {
            const date = new Date(event.startsAt);
            return (
              date >=
                new Date(
                  monthRange.first.getFullYear(),
                  monthRange.first.getMonth(),
                  1,
                  0,
                  0,
                  0,
                ) &&
              date <=
                new Date(
                  monthRange.first.getFullYear(),
                  monthRange.first.getMonth() + 1,
                  31,
                  23,
                  59,
                  59,
                )
            );
          });
          setEvents(filtered);
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

    if (tenantId !== undefined) load();

    return () => {
      cancelled = true;
    };
  }, [monthRange.first]);

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

  const grouped = useMemo(() => {
    const map = new Map();
    events.forEach((event) => {
      const key = new Date(event.startsAt).toDateString();
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(event);
    });
    return Array.from(map.entries()).map(([key, items]) => ({
      dayLabel: new Intl.DateTimeFormat("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
      }).format(new Date(key)),
      items,
    }));
  }, [events]);

  const handleConfirm = async (eventId, status = "CONFIRMADO") => {
    try {
      const updated = await confirmAgendaAttendance(eventId, status, tenantId);
      setEvents((prev) => prev.map((ev) => (ev.id === eventId ? updated : ev)));
      setMessage("Presenca atualizada");
    } catch (error) {
      setMessage(error?.message || "Nao foi possivel confirmar presenca");
    }
  };

  return (
    <main className="space-y-6">
      <section className="rounded-4xl border border-white/10 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.2),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-white/40">
              Agenda do aluno
            </p>
            <h1 className="mt-2 font-title text-4xl text-[#d4f7a0]">
              Seus horarios e orientacoes
            </h1>
            <p className="mt-3 text-sm text-white/68">
              Aqui aparecem os compromissos que seu personal cadastrou para
              voce, incluindo treino e dieta.
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

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-sm text-white/65">
          Carregando agenda...
        </div>
      ) : grouped.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-sm text-white/65">
          Nenhum evento na agenda por enquanto.
        </div>
      ) : (
        <>
          <section className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-4 md:p-6">
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() =>
                  setMonthCursor(
                    (prev) =>
                      new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
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
                    (prev) =>
                      new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
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
                          {new Date(event.startsAt).toLocaleTimeString(
                            "pt-BR",
                            { hour: "2-digit", minute: "2-digit" },
                          )}{" "}
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

          {grouped.map((group) => (
            <section
              key={group.dayLabel}
              className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6"
            >
              <h2 className="font-title text-2xl capitalize text-[#b5f03c]">
                {group.dayLabel}
              </h2>
              <div className="mt-4 space-y-3">
                {group.items.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-2xl border border-white/10 bg-black/30 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
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
                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-white/70">
                      <span className="inline-flex items-center gap-2">
                        <Clock3 size={14} className="text-white/50" />
                        {formatDateTime(event.startsAt)}
                      </span>
                      {event.workoutPlan?.title ? (
                        <span className="inline-flex items-center gap-2">
                          <Dumbbell size={14} className="text-white/50" />
                          {event.workoutPlan.title}
                        </span>
                      ) : null}
                      {event.dietNotes ? (
                        <span className="inline-flex items-center gap-2">
                          <Salad size={14} className="text-white/50" />
                          {event.dietNotes}
                        </span>
                      ) : null}
                    </div>
                    {event.description ? (
                      <p className="mt-2 text-sm text-white/60">
                        {event.description}
                      </p>
                    ) : null}
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleConfirm(event.id, "CONFIRMADO")}
                        className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/35 px-3 py-1.5 text-xs text-emerald-200"
                      >
                        <CheckCircle2 size={13} />
                        Confirmar presenca
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </main>
  );
}
