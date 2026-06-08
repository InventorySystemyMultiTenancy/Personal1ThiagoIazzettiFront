import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Dumbbell,
  Salad,
  XCircle,
} from "lucide-react";
import {
  confirmAgendaAttendance,
  listMyAgendaEvents,
  requestAgendaCancel,
  requestAgendaReschedule,
} from "../lib/api.js";
import { useTenant } from "../contexts/TenantContext.jsx";
import { useI18n } from "../contexts/I18nContext.jsx";

const CLIENT_AGENDA_FALLBACKS = {
  "en-US": {
    CLIENT_AGENDA_LABEL_THIAGOIAZZETTI: "Student schedule",
    CLIENT_AGENDA_TITLE_THIAGOIAZZETTI: "Your schedule and guidance",
    CLIENT_AGENDA_SUBTITLE_THIAGOIAZZETTI:
      "Here you can see the appointments your personal trainer registered for you, including workout and diet.",
    CLIENT_AGENDA_LOADING_THIAGOIAZZETTI: "Loading schedule...",
    CLIENT_AGENDA_EMPTY_THIAGOIAZZETTI: "No events in schedule yet.",
    CLIENT_AGENDA_EVENTS_THIAGOIAZZETTI: "events",
    CLIENT_AGENDA_ERROR_LOAD_THIAGOIAZZETTI: "Could not load schedule",
    CLIENT_AGENDA_ATTENDANCE_UPDATED_THIAGOIAZZETTI: "Attendance updated",
    CLIENT_AGENDA_ATTENDANCE_ERROR_THIAGOIAZZETTI:
      "Could not confirm attendance",
    CLIENT_AGENDA_CONFIRM_ATTENDANCE_THIAGOIAZZETTI: "Confirm attendance",
    WEEKDAY_SUN_THIAGOIAZZETTI: "Sun",
    WEEKDAY_MON_THIAGOIAZZETTI: "Mon",
    WEEKDAY_TUE_THIAGOIAZZETTI: "Tue",
    WEEKDAY_WED_THIAGOIAZZETTI: "Wed",
    WEEKDAY_THU_THIAGOIAZZETTI: "Thu",
    WEEKDAY_FRI_THIAGOIAZZETTI: "Fri",
    WEEKDAY_SAT_THIAGOIAZZETTI: "Sat",
  },
  "it-IT": {
    CLIENT_AGENDA_LABEL_THIAGOIAZZETTI: "Agenda studente",
    CLIENT_AGENDA_TITLE_THIAGOIAZZETTI: "I tuoi orari e indicazioni",
    CLIENT_AGENDA_SUBTITLE_THIAGOIAZZETTI:
      "Qui compaiono gli impegni registrati dal tuo personal trainer, inclusi allenamento e dieta.",
    CLIENT_AGENDA_LOADING_THIAGOIAZZETTI: "Caricamento agenda...",
    CLIENT_AGENDA_EMPTY_THIAGOIAZZETTI: "Nessun evento in agenda per ora.",
    CLIENT_AGENDA_EVENTS_THIAGOIAZZETTI: "eventi",
    CLIENT_AGENDA_ERROR_LOAD_THIAGOIAZZETTI: "Impossibile caricare agenda",
    CLIENT_AGENDA_ATTENDANCE_UPDATED_THIAGOIAZZETTI: "Presenza aggiornata",
    CLIENT_AGENDA_ATTENDANCE_ERROR_THIAGOIAZZETTI:
      "Impossibile confermare la presenza",
    CLIENT_AGENDA_CONFIRM_ATTENDANCE_THIAGOIAZZETTI: "Conferma presenza",
    WEEKDAY_SUN_THIAGOIAZZETTI: "Dom",
    WEEKDAY_MON_THIAGOIAZZETTI: "Lun",
    WEEKDAY_TUE_THIAGOIAZZETTI: "Mar",
    WEEKDAY_WED_THIAGOIAZZETTI: "Mer",
    WEEKDAY_THU_THIAGOIAZZETTI: "Gio",
    WEEKDAY_FRI_THIAGOIAZZETTI: "Ven",
    WEEKDAY_SAT_THIAGOIAZZETTI: "Sab",
  },
  "es-ES": {
    CLIENT_AGENDA_LABEL_THIAGOIAZZETTI: "Agenda del alumno",
    CLIENT_AGENDA_TITLE_THIAGOIAZZETTI: "Tus horários y orientaciones",
    CLIENT_AGENDA_SUBTITLE_THIAGOIAZZETTI:
      "Aqui aparecen los compromisos que tu personal trainer registró para ti, incluyendo entrenamiento y dieta.",
    CLIENT_AGENDA_LOADING_THIAGOIAZZETTI: "Cargando agenda...",
    CLIENT_AGENDA_EMPTY_THIAGOIAZZETTI:
      "No hay eventos en la agenda por ahora.",
    CLIENT_AGENDA_EVENTS_THIAGOIAZZETTI: "eventos",
    CLIENT_AGENDA_ERROR_LOAD_THIAGOIAZZETTI: "No fue posible cargar agenda",
    CLIENT_AGENDA_ATTENDANCE_UPDATED_THIAGOIAZZETTI: "Asistencia actualizada",
    CLIENT_AGENDA_ATTENDANCE_ERROR_THIAGOIAZZETTI:
      "No fue posible confirmar asistencia",
    CLIENT_AGENDA_CONFIRM_ATTENDANCE_THIAGOIAZZETTI: "Confirmar asistencia",
    WEEKDAY_SUN_THIAGOIAZZETTI: "Dom",
    WEEKDAY_MON_THIAGOIAZZETTI: "Lun",
    WEEKDAY_TUE_THIAGOIAZZETTI: "Mar",
    WEEKDAY_WED_THIAGOIAZZETTI: "Mié",
    WEEKDAY_THU_THIAGOIAZZETTI: "Jue",
    WEEKDAY_FRI_THIAGOIAZZETTI: "Vie",
    WEEKDAY_SAT_THIAGOIAZZETTI: "Sáb",
  },
};

function translateClientAgenda(rawT, locale, key, fallback = "") {
  const remoteValue = rawT(key, "");
  const localValue = CLIENT_AGENDA_FALLBACKS[locale]?.[key];
  const isLikelyUntranslated =
    locale !== "pt-BR" && locale !== "pt-PT" && remoteValue === fallback;

  if (isLikelyUntranslated && localValue) {
    return localValue;
  }

  return remoteValue || localValue || fallback || key;
}

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

const STUDENT_CHANGE_DEADLINE_HOURS = 2;

function toDateTimeInputValue(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (v) => String(v).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function ClientAgendaPage() {
  const { t: rawT, locale } = useI18n();
  const t = useCallback(
    (key, fallback = "") => translateClientAgenda(rawT, locale, key, fallback),
    [rawT, locale],
  );
  const { tenantId } = useTenant();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const [rescheduleEventId, setRescheduleEventId] = useState("");
  const [rescheduleStartsAt, setRescheduleStartsAt] = useState("");

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
      new Intl.DateTimeFormat(locale || "pt-BR", {
        month: "long",
        year: "numeric",
      }).format(monthCursor),
    [monthCursor, locale],
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
          setEvents(list);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(
            error?.message ||
              t(
                "CLIENT_AGENDA_ERROR_LOAD_THIAGOIAZZETTI",
                "Não foi possível carregar agenda",
              ),
          );
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
  }, []);

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
      dayLabel: new Intl.DateTimeFormat(locale || "pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
      }).format(new Date(key)),
      items,
    }));
  }, [events, locale]);

  const handleConfirm = async (eventId, status = "CONFIRMADO") => {
    try {
      const updated = await confirmAgendaAttendance(eventId, status, tenantId);
      setEvents((prev) => prev.map((ev) => (ev.id === eventId ? updated : ev)));
      setMessage(
        t(
          "CLIENT_AGENDA_ATTENDANCE_UPDATED_THIAGOIAZZETTI",
          "Presença atualizada",
        ),
      );
    } catch (error) {
      setMessage(
        error?.message ||
          t(
            "CLIENT_AGENDA_ATTENDANCE_ERROR_THIAGOIAZZETTI",
            "Não foi possível confirmar presença",
          ),
      );
    }
  };

  const canRequestChange = (event) => {
    if (!event?.startsAt) return false;
    if (event.changeRequestStatus === "PENDING") return false;
    const startsAt = new Date(event.startsAt);
    if (Number.isNaN(startsAt.getTime())) return false;
    const cutoff = STUDENT_CHANGE_DEADLINE_HOURS * 60 * 60 * 1000;
    return startsAt.getTime() - Date.now() >= cutoff;
  };

  const handleRequestCancel = async (event) => {
    if (!canRequestChange(event)) {
      setMessage(
        "Cancelamento so pode ser solicitado com no minimo 2h de antecedencia.",
      );
      return;
    }

    const reason =
      window.prompt("Motivo do cancelamento (opcional):", "") || "";
    try {
      const updated = await requestAgendaCancel(event.id, reason, tenantId);
      setEvents((prev) =>
        prev.map((ev) => (ev.id === event.id ? updated : ev)),
      );
      setMessage(
        "Solicitação de cancelamento enviada para aprovação do personal.",
      );
    } catch (error) {
      setMessage(error?.message || "Não foi possível solicitar cancelamento.");
    }
  };

  const openReschedule = (event) => {
    setRescheduleEventId(event.id);
    setRescheduleStartsAt(toDateTimeInputValue(event.startsAt));
  };

  const handleRequestReschedule = async (event) => {
    if (!canRequestChange(event)) {
      setMessage(
        "Remarcação só pode ser solicitada com no mínimo 2h de antecedência.",
      );
      return;
    }

    const nextStart = new Date(rescheduleStartsAt);
    if (!rescheduleStartsAt || Number.isNaN(nextStart.getTime())) {
      setMessage("Informe um novo horário válido para remarcação.");
      return;
    }

    const currentStart = new Date(event.startsAt);
    const currentEnd = event.endsAt ? new Date(event.endsAt) : null;
    const durationMs =
      currentEnd && !Number.isNaN(currentEnd.getTime())
        ? currentEnd.getTime() - currentStart.getTime()
        : null;
    const proposedEndsAt =
      durationMs && durationMs > 0
        ? new Date(nextStart.getTime() + durationMs).toISOString()
        : null;

    try {
      const updated = await requestAgendaReschedule(
        event.id,
        {
          proposedStartsAt: nextStart.toISOString(),
          proposedEndsAt,
        },
        tenantId,
      );
      setEvents((prev) =>
        prev.map((ev) => (ev.id === event.id ? updated : ev)),
      );
      setRescheduleEventId("");
      setRescheduleStartsAt("");
      setMessage(
        "Solicitação de remarcação enviada para aprovação do personal.",
      );
    } catch (error) {
      setMessage(error?.message || "Não foi possível solicitar remarcação.");
    }
  };

  return (
    <main className="space-y-6">
      <section className="rounded-4xl border border-white/10 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.2),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-white/40">
              {t("CLIENT_AGENDA_LABEL_THIAGOIAZZETTI", "Agenda do aluno")}
            </p>
            <h1 className="mt-2 font-title text-4xl text-[#d4f7a0]">
              {t(
                "CLIENT_AGENDA_TITLE_THIAGOIAZZETTI",
                "Seus horários e orientações",
              )}
            </h1>
            <p className="mt-3 text-sm text-white/68">
              {t(
                "CLIENT_AGENDA_SUBTITLE_THIAGOIAZZETTI",
                "Aqui aparecem os compromissos que seu personal cadastrou para você, incluindo treino e dieta.",
              )}
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
          {t("CLIENT_AGENDA_LOADING_THIAGOIAZZETTI", "Carregando agenda...")}
        </div>
      ) : grouped.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-sm text-white/65">
          {t(
            "CLIENT_AGENDA_EMPTY_THIAGOIAZZETTI",
            "Nenhum evento na agenda por enquanto.",
          )}
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
              {[
                t("WEEKDAY_SUN_THIAGOIAZZETTI", "Dom"),
                t("WEEKDAY_MON_THIAGOIAZZETTI", "Seg"),
                t("WEEKDAY_TUE_THIAGOIAZZETTI", "Ter"),
                t("WEEKDAY_WED_THIAGOIAZZETTI", "Qua"),
                t("WEEKDAY_THU_THIAGOIAZZETTI", "Qui"),
                t("WEEKDAY_FRI_THIAGOIAZZETTI", "Sex"),
                t("WEEKDAY_SAT_THIAGOIAZZETTI", "Sab"),
              ].map((d) => (
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
                            locale || "pt-BR",
                            { hour: "2-digit", minute: "2-digit" },
                          )}{" "}
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 ? (
                        <p className="text-[10px] text-white/55">
                          +{dayEvents.length - 3}{" "}
                          {t("CLIENT_AGENDA_EVENTS_THIAGOIAZZETTI", "eventos")}
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
                    {event.changeRequestStatus === "PENDING" ? (
                      <p className="mt-2 text-xs text-amber-200">
                        Solicitação pendente:{" "}
                        {event.changeRequestType === "RESCHEDULE"
                          ? "Remarcação"
                          : "Cancelamento"}
                      </p>
                    ) : null}
                    {event.changeRequestStatus === "REJECTED" ? (
                      <p className="mt-2 text-xs text-red-200">
                        Solicitação anterior recusada pelo personal.
                      </p>
                    ) : null}
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleConfirm(event.id, "CONFIRMADO")}
                        className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/35 px-3 py-1.5 text-xs text-emerald-200"
                      >
                        <CheckCircle2 size={13} />
                        {t(
                          "CLIENT_AGENDA_CONFIRM_ATTENDANCE_THIAGOIAZZETTI",
                          "Confirmar presença",
                        )}
                      </button>
                      {canRequestChange(event) ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleRequestCancel(event)}
                            className="inline-flex items-center gap-2 rounded-lg border border-red-400/35 px-3 py-1.5 text-xs text-red-200"
                          >
                            <XCircle size={13} />
                            Cancelar aula
                          </button>
                          <button
                            type="button"
                            onClick={() => openReschedule(event)}
                            className="inline-flex items-center gap-2 rounded-lg border border-sky-400/35 px-3 py-1.5 text-xs text-sky-200"
                          >
                            <CalendarClock size={13} />
                            Remarcar
                          </button>
                        </>
                      ) : null}
                    </div>
                    {rescheduleEventId === event.id ? (
                      <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
                        <label className="text-xs text-white/70">
                          Novo horário (mêsma semana)
                          <input
                            type="datetime-local"
                            value={rescheduleStartsAt}
                            onChange={(e) =>
                              setRescheduleStartsAt(e.target.value)
                            }
                            className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none"
                          />
                        </label>
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleRequestReschedule(event)}
                            className="rounded-lg border border-sky-400/35 px-3 py-1.5 text-xs text-sky-200"
                          >
                            Enviar remarcação
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRescheduleEventId("");
                              setRescheduleStartsAt("");
                            }}
                            className="rounded-lg border border-white/20 px-3 py-1.5 text-xs text-white/70"
                          >
                            Fechar
                          </button>
                        </div>
                      </div>
                    ) : null}
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
