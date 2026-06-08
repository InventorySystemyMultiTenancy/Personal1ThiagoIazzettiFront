import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Loader2, MapPin, Trash2, Users } from "lucide-react";
import {
  createPersonalEvent,
  deletePersonalEvent,
  listPersonalEvents,
  listStudents,
} from "../lib/api.js";
import { useTenant } from "../contexts/TenantContext.jsx";
import { useI18n } from "../contexts/I18nContext.jsx";

function todayInputValue() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function isPastEvent(event) {
  const date = new Date(event?.endsAt || event?.startsAt);
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
}

export default function AdminEventsPage() {
  const { tenantId } = useTenant();
  const { t } = useI18n();
  const [students, setStudents] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    title: "",
    date: todayInputValue(),
    time: "19:00",
    location: "",
    description: "",
    alunoIds: [],
  });

  const allSelected =
    students.length > 0 && form.alunoIds.length === students.length;

  const loadData = async () => {
    setLoading(true);
    try {
      const [studentRows, eventRows] = await Promise.all([
        listStudents(tenantId),
        listPersonalEvents(tenantId),
      ]);
      const rows = Array.isArray(eventRows) ? eventRows : [];
      const expiredEvents = rows.filter((event) => event?.id && isPastEvent(event));
      if (expiredEvents.length > 0) {
        await Promise.all(
          expiredEvents.map((event) => deletePersonalEvent(event.id, tenantId)),
        );
      }
      setStudents(Array.isArray(studentRows) ? studentRows : []);
      setEvents(rows.filter((event) => !isPastEvent(event)));
    } catch (error) {
      setMessage(error?.message || "Não foi possível carregar eventos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      const timer = setTimeout(() => {
        loadData();
      }, 0);
      return () => clearTimeout(timer);
    }

    return undefined;
  }, [tenantId]);

  const eventStats = useMemo(
    () =>
      events.map((event) => {
        const participants = event.participants || [];
        return {
          ...event,
          going: participants.filter((item) => item.status === "GOING"),
          notGoing: participants.filter((item) => item.status === "NOT_GOING"),
          pending: participants.filter((item) => item.status === "PENDING"),
        };
      }),
    [events],
  );

  const toggleStudent = (studentId) => {
    setForm((current) => {
      const exists = current.alunoIds.includes(studentId);
      return {
        ...current,
        alunoIds: exists
          ? current.alunoIds.filter((id) => id !== studentId)
          : [...current.alunoIds, studentId],
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    if (!form.title || !form.date || !form.time) {
      setMessage("Título, data e horário são obrigatórios.");
      return;
    }

    try {
      await createPersonalEvent(form, tenantId);
      setForm({
        title: "",
        date: todayInputValue(),
        time: "19:00",
        location: "",
        description: "",
        alunoIds: [],
      });
      await loadData();
      setMessage("Evento criado com sucesso.");
    } catch (error) {
      setMessage(error?.message || "Não foi possível criar o evento.");
    }
  };

  const handleDeleteEvent = async (event) => {
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir o evento "${event.title}"?`,
    );

    if (!confirmed) return;

    setDeletingEventId(event.id);
    try {
      await deletePersonalEvent(event.id, tenantId);
      setEvents((current) => current.filter((item) => item.id !== event.id));
      setMessage("Evento excluído com sucesso.");
    } catch (error) {
      setMessage(
        error?.status === 404
          ? "A rota DELETE /personal-events/:id ainda não existe no backend. Use o prompt em docs/backend-delete-event-message-prompt.md."
          : error?.message || "Não foi possível excluir o evento.",
      );
    } finally {
      setDeletingEventId("");
    }
  };

  return (
    <main className="space-y-5">
      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
        <div className="flex items-center gap-3">
          <CalendarDays className="text-[#b5f03c]" />
          <div>
            <h1 className="text-2xl font-bold text-white">
              {t("EVENTS_TITLE", "Eventos")}
            </h1>
            <p className="text-sm text-white/50">
              Crie eventos e acompanhe quem confirmou presença.
            </p>
          </div>
        </div>
      </section>

      {message ? (
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white/70">
          {message}
        </div>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5"
        >
          <h2 className="font-semibold text-white">Novo evento</h2>
          <div className="mt-4 grid gap-3">
            <input
              value={form.title}
              onChange={(e) =>
                setForm((current) => ({ ...current, title: e.target.value }))
              }
              placeholder="Título"
              className="rounded-md border border-white/[0.06] bg-[#0b0b0b] px-3 py-2 text-white"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((current) => ({ ...current, date: e.target.value }))
                }
                className="rounded-md border border-white/[0.06] bg-[#0b0b0b] px-3 py-2 text-white"
              />
              <input
                type="time"
                value={form.time}
                onChange={(e) =>
                  setForm((current) => ({ ...current, time: e.target.value }))
                }
                className="rounded-md border border-white/[0.06] bg-[#0b0b0b] px-3 py-2 text-white"
              />
            </div>
            <input
              value={form.location}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  location: e.target.value,
                }))
              }
              placeholder="Lugar"
              className="rounded-md border border-white/[0.06] bg-[#0b0b0b] px-3 py-2 text-white"
            />
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  description: e.target.value,
                }))
              }
              placeholder="Descrição"
              rows={4}
              className="resize-none rounded-md border border-white/[0.06] bg-[#0b0b0b] px-3 py-2 text-white"
            />
          </div>

          <div className="mt-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">Alunos</p>
              <button
                type="button"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    alunoIds: allSelected ? [] : students.map((s) => s.id),
                  }))
                }
                className="rounded-md border border-white/[0.08] px-3 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/[0.05]"
              >
                {allSelected ? "Limpar todos" : "Adicionar todos"}
              </button>
            </div>
            <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
              {students.map((student) => (
                <label
                  key={student.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm text-white/70"
                >
                  <input
                    type="checkbox"
                    checked={form.alunoIds.includes(student.id)}
                    onChange={() => toggleStudent(student.id)}
                  />
                  {student.fullName || student.email || student.id}
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="mt-5 rounded-md bg-[#b5f03c] px-4 py-2 font-semibold text-black"
          >
            Criar evento
          </button>
        </form>

        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-white">Eventos criados</h2>
            {loading ? <Loader2 className="animate-spin text-[#b5f03c]" /> : null}
          </div>
          <div className="space-y-3">
            {eventStats.length === 0 ? (
              <p className="rounded-md border border-white/[0.06] p-4 text-sm text-white/50">
                Nenhum evento criado ainda.
              </p>
            ) : (
              eventStats.map((event) => (
                <article
                  key={event.id}
                  className="rounded-lg border border-white/[0.06] bg-black/20 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-white">{event.title}</h3>
                      <p className="mt-1 text-sm text-white/55">
                        {formatDateTime(event.startsAt)}
                      </p>
                      {event.location ? (
                        <p className="mt-1 flex items-center gap-1 text-sm text-white/50">
                          <MapPin size={14} /> {event.location}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 rounded-full border border-[#b5f03c]/25 px-3 py-1 text-xs text-[#b5f03c]">
                        <Users size={13} />
                        {event.going.length} confirmados
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteEvent(event)}
                        disabled={deletingEventId === event.id}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-400/25 text-red-200/60 transition hover:border-red-300/60 hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                        title="Excluir evento"
                      >
                        {deletingEventId === event.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </div>
                  </div>
                  {event.description ? (
                    <p className="mt-3 text-sm leading-6 text-white/60">
                      {event.description}
                    </p>
                  ) : null}
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div>
                      <p className="text-xs font-semibold text-emerald-300">
                        Vai
                      </p>
                      <p className="mt-1 text-xs text-white/55">
                        {event.going.map((item) => item.aluno?.fullName).join(", ") ||
                          "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-red-300">
                        Não vai
                      </p>
                      <p className="mt-1 text-xs text-white/55">
                        {event.notGoing
                          .map((item) => item.aluno?.fullName)
                          .join(", ") || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white/40">
                        Pendente
                      </p>
                      <p className="mt-1 text-xs text-white/55">
                        {event.pending
                          .map((item) => item.aluno?.fullName)
                          .join(", ") || "-"}
                      </p>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
