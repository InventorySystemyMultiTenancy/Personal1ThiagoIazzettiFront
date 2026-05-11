import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  Copy,
  Eye,
  Dumbbell,
  X,
  AlertCircle,
  CalendarDays,
  Clock3,
} from "lucide-react";
import {
  createWorkoutPlan,
  deleteAgendaEvent,
  getWorkoutPlanDetails,
  listWorkoutPlanTemplates,
  listStudents,
  listWorkoutPlans,
  scheduleWorkoutPlan,
  updateAgendaEvent,
  updateWorkoutPlan,
  cloneWorkoutPlanTemplate,
} from "../lib/api.js";
import { useTenant } from "../contexts/TenantContext.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";

const recurrenceOptions = [
  { label: "Sem recorrencia", value: "NONE" },
  { label: "Semanal", value: "WEEKLY" },
  { label: "Quinzenal", value: "BIWEEKLY" },
  { label: "Mensal", value: "MONTHLY" },
];

function createLocalOffsetISOString(datePart, timePart, seconds = "00") {
  if (!datePart || !timePart) return null;

  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);
  const date = new Date(year, month - 1, day, hours, minutes, Number(seconds));

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteOffset = Math.abs(offsetMinutes);
  const offsetHours = String(Math.floor(absoluteOffset / 60)).padStart(2, "0");
  const offsetRemainder = String(absoluteOffset % 60).padStart(2, "0");

  return `${datePart}T${timePart}:${seconds}${sign}${offsetHours}:${offsetRemainder}`;
}

function toDateFieldValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function toTimeFieldValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function createEmptySession(seed = Date.now()) {
  return {
    id: `session-${seed}-${Math.random().toString(36).slice(2, 7)}`,
    agendaId: "",
    title: "",
    date: "",
    startsAtTime: "07:00",
    endsAtTime: "08:00",
    recurrence: "WEEKLY",
    recurrenceUntilDate: "",
  };
}

function inferPhase(objective) {
  const match = String(objective || "").match(/\[Fase:\s*([^\]]+)\]\s*$/i);
  return match?.[1]?.trim() || "Hipertrofia";
}

function stripPhaseFromObjective(objective) {
  return String(objective || "")
    .replace(/\s*\[Fase:\s*[^\]]+\]\s*$/i, "")
    .trim();
}

function buildWorkoutObjective(objective, phase) {
  const cleanedObjective = String(objective || "").trim();
  return `${cleanedObjective} [Fase: ${phase}]`.trim();
}

function normalizeWorkoutPlan(plan) {
  return {
    ...plan,
    exercises: Array.isArray(plan?.items) ? plan.items : [],
    schedule: Array.isArray(plan?.schedule) ? plan.schedule : [],
  };
}

function normalizeWorkoutTemplate(template) {
  const raw = template || {};
  const items = Array.isArray(raw.items)
    ? raw.items
    : Array.isArray(raw.exercises)
      ? raw.exercises
      : [];

  return {
    ...raw,
    id: String(raw.id || raw.templateId || raw.planId || raw.name || ""),
    title: raw.title || raw.name || "Template",
    objective: raw.objective || raw.description || "",
    items,
  };
}

function ScheduleSessionModal({
  workout,
  loading,
  saving,
  error,
  updatingSessionId,
  deletingSessionId,
  replaceExisting,
  sessions,
  onClose,
  onToggleReplaceExisting,
  onSessionChange,
  onAddSession,
  onRemoveSession,
  onUpdateExistingSession,
  onDeleteExistingSession,
  onSubmit,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-4xl border border-white/10 bg-[#0a0a0a] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/45">
              Agendar treinos
            </p>
            <h2 className="mt-2 font-title text-3xl text-[#d9c179]">
              {workout.title}
            </h2>
            <p className="mt-2 text-sm text-white/65">
              Defina dias, horarios e recorrencia das proximas sessoes desse plano.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-full border border-white/10 p-2 text-white/60 transition hover:text-white disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        <label className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
          <input
            type="checkbox"
            checked={replaceExisting}
            onChange={(event) => onToggleReplaceExisting(event.target.checked)}
            disabled={saving || loading}
          />
          Substituir agenda existente deste plano
        </label>

        {loading ? (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-sm text-white/65">
            Carregando agenda atual do plano...
          </div>
        ) : null}

        <div className="mt-5 space-y-4">
          {sessions.map((session, index) => (
            <div
              key={session.id}
              className="rounded-3xl border border-white/10 bg-black/30 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-white">
                  Sessao {index + 1}
                </p>
                {sessions.length > 1 || session.agendaId ? (
                  <button
                    type="button"
                    onClick={() =>
                      session.agendaId
                        ? onDeleteExistingSession(session)
                        : onRemoveSession(session.id)
                    }
                    disabled={saving || loading || deletingSessionId === session.id}
                    className="rounded-lg border border-white/10 p-2 text-white/60 transition hover:text-red-400 disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                  </button>
                ) : null}
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <label className="text-sm text-white/70 xl:col-span-3">
                  Titulo da sessao
                  <input
                    value={session.title}
                    onChange={(event) =>
                      onSessionChange(session.id, "title", event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none"
                    placeholder="Ex: Treino A"
                    disabled={saving || loading}
                  />
                </label>

                <label className="text-sm text-white/70">
                  Dia
                  <input
                    type="date"
                    value={session.date}
                    onChange={(event) =>
                      onSessionChange(session.id, "date", event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none"
                    disabled={saving || loading}
                  />
                </label>

                <label className="text-sm text-white/70">
                  Inicio
                  <input
                    type="time"
                    value={session.startsAtTime}
                    onChange={(event) =>
                      onSessionChange(session.id, "startsAtTime", event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none"
                    disabled={saving || loading}
                  />
                </label>

                <label className="text-sm text-white/70">
                  Fim
                  <input
                    type="time"
                    value={session.endsAtTime}
                    onChange={(event) =>
                      onSessionChange(session.id, "endsAtTime", event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none"
                    disabled={saving || loading}
                  />
                </label>

                <label className="text-sm text-white/70">
                  Recorrencia
                  <select
                    value={session.recurrence}
                    onChange={(event) =>
                      onSessionChange(session.id, "recurrence", event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none"
                    disabled={saving || loading}
                  >
                    {recurrenceOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm text-white/70">
                  Repetir ate
                  <input
                    type="date"
                    value={session.recurrenceUntilDate}
                    onChange={(event) =>
                      onSessionChange(
                        session.id,
                        "recurrenceUntilDate",
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none"
                    disabled={saving || loading || session.recurrence === "NONE"}
                  />
                </label>
              </div>

              {session.agendaId ? (
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => onUpdateExistingSession(session)}
                    disabled={saving || loading || updatingSessionId === session.id}
                    className="rounded-xl border border-[#d9b341]/50 bg-[#d9b341]/10 px-4 py-2 text-sm font-semibold text-[#d9c179] transition hover:bg-[#d9b341]/20 disabled:opacity-50"
                  >
                    {updatingSessionId === session.id
                      ? "Salvando sessao..."
                      : "Salvar sessao"}
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteExistingSession(session)}
                    disabled={saving || loading || deletingSessionId === session.id}
                    className="rounded-xl border border-red-400/45 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
                  >
                    {deletingSessionId === session.id
                      ? "Excluindo..."
                      : "Excluir sessao"}
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onAddSession}
            disabled={saving || loading}
            className="rounded-xl border border-[#d9b341]/50 bg-[#d9b341]/10 px-4 py-3 text-sm font-semibold text-[#d9c179] transition hover:bg-[#d9b341]/20 disabled:opacity-50"
          >
            <Plus size={16} className="mr-2 inline-block" />
            Adicionar sessao
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={saving || loading}
            className="rounded-xl bg-[#d9b341] px-5 py-3 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-60"
          >
            {saving ? "Agendando..." : "Salvar agenda"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TemplateLibraryModal({
  templates,
  loading,
  error,
  previewTemplateId,
  onTogglePreview,
  onInsert,
  onClone,
  onClose,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-4xl border border-white/10 bg-[#0a0a0a] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/45">
              Biblioteca de templates
            </p>
            <h2 className="mt-2 font-title text-3xl text-[#d9c179]">
              Templates de treino
            </h2>
            <p className="mt-2 text-sm text-white/65">
              Visualize e importe templates para acelerar a montagem do treino.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 p-2 text-white/60 transition hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-sm text-white/65">
            Carregando templates...
          </div>
        ) : null}

        {!loading && templates.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-white/65">
            Nenhum template encontrado.
          </div>
        ) : null}

        <div className="mt-5 space-y-3">
          {templates.map((template) => {
            const previewItems = template.items.slice(0, 4);
            const isPreviewOpen = previewTemplateId === template.id;

            return (
              <div
                key={template.id}
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-white">{template.title}</p>
                    <p className="text-sm text-white/55">
                      {template.objective || "Objetivo nao informado."}
                    </p>
                    <p className="mt-1 text-xs text-white/40">
                      {template.items.length} exercicio(s)
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onTogglePreview(template.id)}
                      className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/65 transition hover:border-white/20"
                    >
                      <Eye size={14} />
                      {isPreviewOpen ? "Ocultar" : "Visualizar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onInsert(template)}
                      className="rounded-lg border border-[#d9b341]/50 bg-[#d9b341]/10 px-4 py-2 text-sm font-semibold text-[#d9c179] transition hover:bg-[#d9b341]/20"
                    >
                      Inserir no formulario
                    </button>
                    <button
                      type="button"
                      onClick={() => onClone(template)}
                      className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white/70 transition hover:border-white/20"
                    >
                      Clonar para aluno
                    </button>
                  </div>
                </div>

                {isPreviewOpen ? (
                  <div className="mt-4 grid gap-2 md:grid-cols-2">
                    {previewItems.map((item, index) => (
                      <div
                        key={item.id || `${template.id}-${index}`}
                        className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/70"
                      >
                        <p className="font-semibold text-white">
                          {item.exerciseName}
                        </p>
                        <p className="text-xs text-white/50">
                          {item.sets}x{item.reps} • Descanso: {item.restSeconds || 0}s
                        </p>
                      </div>
                    ))}
                    {template.items.length > previewItems.length ? (
                      <p className="text-xs text-white/45">
                        +{template.items.length - previewItems.length} exercicio(s)
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CloneTemplateModal({
  template,
  students,
  selectedStudentId,
  onSelectStudent,
  onClose,
  onConfirm,
  loading,
  error,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur">
      <div className="w-full max-w-xl rounded-4xl border border-white/10 bg-[#0a0a0a] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/45">
              Clonar template
            </p>
            <h2 className="mt-2 font-title text-2xl text-[#d9c179]">
              {template?.title}
            </h2>
            <p className="mt-2 text-sm text-white/65">
              Selecione o aluno para criar o treino a partir do template.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-full border border-white/10 p-2 text-white/60 transition hover:text-white disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        <label className="mt-5 block text-sm text-white/70">
          Aluno
          <select
            value={selectedStudentId}
            onChange={(event) => onSelectStudent(event.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none"
          >
            <option value="">Selecione um aluno</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.fullName}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={!selectedStudentId || loading}
            className="rounded-xl bg-[#d9b341] px-5 py-3 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-60"
          >
            {loading ? "Clonando..." : "Clonar template"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-white/70 transition hover:border-white/20 disabled:opacity-60"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// Biblioteca de exercícios por grupo muscular
const exerciseLibrary = {
  Peito: [
    { name: "Supino reto", equipment: "Barra" },
    { name: "Supino inclinado", equipment: "Halteres" },
    { name: "Crucifixo na máquina", equipment: "Máquina" },
    { name: "Flexão com peso", equipment: "Disco" },
    { name: "Rosca na máquina (peck-deck)", equipment: "Máquina" },
  ],
  Costas: [
    { name: "Barra fixa", equipment: "Barra" },
    { name: "Remada alta", equipment: "Barra" },
    { name: "Remada curvada", equipment: "Halteres" },
    { name: "Puxada na máquina", equipment: "Máquina" },
    { name: "Remada sentado", equipment: "Máquina" },
  ],
  Pernas: [
    { name: "Agachamento livre", equipment: "Barra" },
    { name: "Leg press", equipment: "Máquina" },
    { name: "Rosca de perna", equipment: "Máquina" },
    { name: "Extensora de perna", equipment: "Máquina" },
    { name: "Adução (máquina)", equipment: "Máquina" },
  ],
  Ombros: [
    { name: "Desenvolvimento com halteres", equipment: "Halteres" },
    { name: "Elevação lateral", equipment: "Halteres" },
    { name: "Encolhimento com halteres", equipment: "Halteres" },
    { name: "Desenvolvimento na máquina", equipment: "Máquina" },
    { name: "Puxada alta reversa", equipment: "Máquina" },
  ],
  Braços: [
    { name: "Rosca direta", equipment: "Barra" },
    { name: "Rosca com halteres", equipment: "Halteres" },
    { name: "Tríceps na máquina", equipment: "Máquina" },
    { name: "Tríceps com corda", equipment: "Corda" },
    { name: "Rosca concentrada", equipment: "Halteres" },
  ],
  Core: [
    { name: "Abdominal na máquina", equipment: "Máquina" },
    { name: "Prancha", equipment: "Corpo" },
    { name: "Abdominal declinado", equipment: "Banco" },
    { name: "Abdominal na bola", equipment: "Bola" },
  ],
};


function ExerciseSelector({ onAdd, onClose }) {
  const [selectedGroup, setSelectedGroup] = useState("Peito");
  const [formData, setFormData] = useState({
    exerciseName: "",
    sets: 3,
    reps: 10,
    restSeconds: 60,
  });

  const filteredExercises = exerciseLibrary[selectedGroup] || [];

  const handleAddExercise = (e) => {
    e.preventDefault();
    if (formData.exerciseName.trim()) {
      onAdd(formData);
      setFormData({ exerciseName: "", sets: 3, reps: 10, restSeconds: 60 });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur">
      <div className="w-full max-w-2xl rounded-4xl border border-white/10 bg-[#0a0a0a] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-title text-2xl text-[#d9c179]">
            Adicionar Exercício
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-white/60 transition hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        <form className="space-y-5" onSubmit={handleAddExercise}>
          <label className="block text-sm text-white/70">
            Grupo Muscular
            <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
              {Object.keys(exerciseLibrary).map((group) => (
                <button
                  key={group}
                  type="button"
                  onClick={() => setSelectedGroup(group)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    selectedGroup === group
                      ? "border border-[#d9b341]/50 bg-[#d9b341]/15 text-[#d9c179]"
                      : "border border-white/10 text-white/60 hover:border-white/20"
                  }`}
                >
                  {group}
                </button>
              ))}
            </div>
          </label>

          <label className="block text-sm text-white/70">
            Exercício
            <select
              value={formData.exerciseName}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  exerciseName: e.target.value,
                }))
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none transition focus:border-[#d9b341]/50"
            >
              <option value="">Selecione um exercício</option>
              {filteredExercises.map((ex) => (
                <option key={ex.name} value={ex.name}>
                  {ex.name} ({ex.equipment})
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="block text-sm text-white/70">
              Séries
              <input
                type="number"
                min="1"
                max="10"
                value={formData.sets}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    sets: parseInt(e.target.value),
                  }))
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none transition focus:border-[#d9b341]/50"
              />
            </label>

            <label className="block text-sm text-white/70">
              Repetições
              <input
                type="number"
                min="1"
                max="100"
                value={formData.reps}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    reps: parseInt(e.target.value),
                  }))
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none transition focus:border-[#d9b341]/50"
              />
            </label>

            <label className="block text-sm text-white/70">
              Descanso (segundos)
              <input
                type="number"
                min="0"
                step="15"
                value={formData.restSeconds}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    restSeconds: parseInt(e.target.value),
                  }))
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none transition focus:border-[#d9b341]/50"
              />
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 rounded-xl bg-[#d9b341] px-4 py-3 font-semibold text-black transition hover:brightness-110"
            >
              Adicionar exercício
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-white/10 px-4 py-3 font-semibold text-white/70 transition hover:border-white/20"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function WorkoutItem({ exercise, onRemove, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    sets: exercise.sets ?? 0,
    reps: exercise.reps ?? "",
    restSeconds: exercise.restSeconds ?? "",
  });

  useEffect(() => {
    setDraft({
      sets: exercise.sets ?? 0,
      reps: exercise.reps ?? "",
      restSeconds: exercise.restSeconds ?? "",
    });
  }, [exercise.reps, exercise.restSeconds, exercise.sets]);

  const handleSave = () => {
    onUpdate(exercise.id, {
      sets: Number(draft.sets) || 0,
      reps: String(draft.reps || ""),
      restSeconds:
        draft.restSeconds === "" ? null : Number(draft.restSeconds),
    });
    setEditing(false);
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 md:flex-row md:items-center md:justify-between">
      <div className="flex-1">
        <p className="font-semibold text-white">{exercise.exerciseName}</p>
        {editing ? (
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <label className="text-xs text-white/60">
              Series
              <input
                type="number"
                min="1"
                value={draft.sets}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, sets: event.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none"
              />
            </label>
            <label className="text-xs text-white/60">
              Repeticoes
              <input
                type="number"
                min="1"
                value={draft.reps}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, reps: event.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none"
              />
            </label>
            <label className="text-xs text-white/60">
              Descanso (s)
              <input
                type="number"
                min="0"
                step="15"
                value={draft.restSeconds}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    restSeconds: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none"
              />
            </label>
          </div>
        ) : (
          <p className="text-sm text-white/60">
            {exercise.sets}x{exercise.reps} • Descanso:{" "}
            {exercise.restSeconds ? `${exercise.restSeconds}s` : "livre"}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg border border-[#d9b341]/50 bg-[#d9b341]/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#d9c179]"
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/60"
            >
              Cancelar
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-lg border border-white/10 p-2 text-white/60 transition hover:text-[#d9b341]"
          >
            <Edit2 size={16} />
          </button>
        )}
        <button
          type="button"
          onClick={() => onRemove(exercise.id)}
          className="rounded-lg border border-white/10 p-2 text-white/60 transition hover:text-red-400"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

export default function WorkoutBuilderPage() {
  const { tenantId } = useTenant();
  const { isPersonal } = useAuth();
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [workouts, setWorkouts] = useState([]);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [currentWorkoutExercises, setCurrentWorkoutExercises] = useState([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingWorkoutId, setEditingWorkoutId] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [loadingScheduleDetails, setLoadingScheduleDetails] = useState(false);
  const [scheduleError, setScheduleError] = useState("");
  const [scheduleTarget, setScheduleTarget] = useState(null);
  const [replaceExistingSchedule, setReplaceExistingSchedule] = useState(true);
  const [scheduleSessions, setScheduleSessions] = useState([createEmptySession()]);
  const [updatingSessionId, setUpdatingSessionId] = useState("");
  const [deletingSessionId, setDeletingSessionId] = useState("");
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templatesError, setTemplatesError] = useState("");
  const [previewTemplateId, setPreviewTemplateId] = useState("");
  const [cloneTemplateTarget, setCloneTemplateTarget] = useState(null);
  const [cloneStudentId, setCloneStudentId] = useState("");
  const [cloningTemplate, setCloningTemplate] = useState(false);
  const [cloneTemplateError, setCloneTemplateError] = useState("");
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [workoutForm, setWorkoutForm] = useState({
    title: "",
    objective: "",
    phase: "Hipertrofia",
  });

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId) || null,
    [students, selectedStudentId],
  );

  const canUseTemplates = isPersonal;

  const toEditableSession = (session, fallbackTitle, index) => ({
    id: session.id || `existing-${index}`,
    agendaId: session.id || "",
    title: session.title || fallbackTitle,
    date: toDateFieldValue(session.startsAt),
    startsAtTime: toTimeFieldValue(session.startsAt) || "07:00",
    endsAtTime: toTimeFieldValue(session.endsAt) || "08:00",
    recurrence: session.recurrence || "WEEKLY",
    recurrenceUntilDate: toDateFieldValue(session.recurrenceUntil),
  });

  const openScheduleModal = async (workout) => {
    setScheduleTarget(workout);
    setReplaceExistingSchedule(true);
    setScheduleError("");
    setShowScheduleModal(true);
    setLoadingScheduleDetails(true);

    try {
      const details = normalizeWorkoutPlan(
        await getWorkoutPlanDetails(workout.id, tenantId),
      );
      const sourceSessions = Array.isArray(details.schedule) ? details.schedule : [];
      const draftSessions = sourceSessions.length
        ? sourceSessions.map((session, index) =>
            toEditableSession(session, details.title, index),
          )
        : [
            {
              ...createEmptySession(),
              title: details.title,
            },
          ];

      setWorkouts((current) =>
        current.map((item) => (item.id === details.id ? details : item)),
      );
      setScheduleTarget(details);
      setScheduleSessions(draftSessions);
    } catch (error) {
      setScheduleError(error?.message || "Nao foi possivel carregar a agenda deste plano.");
      setScheduleSessions([
        {
          ...createEmptySession(),
          title: workout.title,
        },
      ]);
    } finally {
      setLoadingScheduleDetails(false);
    }
  };

  const closeScheduleModal = () => {
    if (scheduling) return;
    setShowScheduleModal(false);
    setScheduleTarget(null);
    setScheduleSessions([createEmptySession()]);
    setScheduleError("");
    setUpdatingSessionId("");
    setDeletingSessionId("");
  };

  const resetWorkoutForm = () => {
    setEditingWorkoutId("");
    setWorkoutForm({ title: "", objective: "", phase: "Hipertrofia" });
    setCurrentWorkoutExercises([]);
    setSaveAsTemplate(false);
    setTemplateName("");
  };

  useEffect(() => {
    let cancelled = false;

    const loadStudents = async () => {
      try {
        const data = await listStudents(tenantId);
        if (!cancelled) {
          const items = Array.isArray(data) ? data : [];
          setStudents(items);
          if (items.length > 0) {
            setSelectedStudentId((prev) => prev || items[0].id);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(error?.message || "Nao foi possivel carregar alunos");
        }
      }
    };

    if (tenantId) {
      loadStudents();
    }

    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  useEffect(() => {
    let cancelled = false;

    const loadWorkouts = async () => {
      if (!selectedStudentId) {
        setWorkouts([]);
        return;
      }

      try {
        const data = await listWorkoutPlans(selectedStudentId, tenantId);
        if (!cancelled) {
          const plans = Array.isArray(data) ? data : [];
          const normalized = plans.map(normalizeWorkoutPlan);
          setWorkouts(normalized);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(error?.message || "Nao foi possivel carregar treinos");
        }
      }
    };

    loadWorkouts();

    return () => {
      cancelled = true;
    };
  }, [selectedStudentId, tenantId]);

  const handleAddExerciseToWorkout = (exercise) => {
    const id = Math.random().toString(36).substr(2, 9);
    setCurrentWorkoutExercises((prev) => [...prev, { ...exercise, id }]);
    setShowExerciseModal(false);
  };

  const handleRemoveExercise = (id) => {
    setCurrentWorkoutExercises((prev) => prev.filter((ex) => ex.id !== id));
  };

  const handleUpdateExercise = (id, changes) => {
    setCurrentWorkoutExercises((prev) =>
      prev.map((exercise) =>
        exercise.id === id ? { ...exercise, ...changes } : exercise,
      ),
    );
  };

  const handleToggleSaveAsTemplate = (checked) => {
    setSaveAsTemplate(checked);
    if (checked) {
      setTemplateName((prev) => prev.trim() || workoutForm.title.trim());
    } else {
      setTemplateName("");
    }
  };

  const handleInsertTemplate = (template) => {
    setEditingWorkoutId("");
    setWorkoutForm({
      title: template.title,
      objective: stripPhaseFromObjective(template.objective),
      phase: inferPhase(template.objective),
    });

    const exercisesWithIds = template.items.map((exercise) => ({
      ...exercise,
      id: Math.random().toString(36).substr(2, 9),
    }));
    setCurrentWorkoutExercises(exercisesWithIds);
    setShowTemplatesModal(false);
    setMessage(`Template "${template.title}" inserido no formulario.`);
  };

  const loadTemplates = async () => {
    if (!tenantId) return;
    setLoadingTemplates(true);
    setTemplatesError("");

    try {
      const result = await listWorkoutPlanTemplates(tenantId);
      const items = Array.isArray(result)
        ? result.map(normalizeWorkoutTemplate)
        : [];
      setTemplates(items);
    } catch (error) {
      setTemplatesError(error?.message || "Nao foi possivel carregar templates.");
    } finally {
      setLoadingTemplates(false);
    }
  };

  const openTemplatesModal = () => {
    setShowTemplatesModal(true);
    setPreviewTemplateId("");
    if (templates.length === 0) {
      loadTemplates();
    }
  };

  const closeTemplatesModal = () => {
    if (loadingTemplates) return;
    setShowTemplatesModal(false);
    setPreviewTemplateId("");
    setTemplatesError("");
  };

  const openCloneTemplateModal = (template) => {
    setCloneTemplateTarget(template);
    setCloneStudentId("");
    setCloneTemplateError("");
  };

  const closeCloneTemplateModal = () => {
    if (cloningTemplate) return;
    setCloneTemplateTarget(null);
    setCloneStudentId("");
    setCloneTemplateError("");
  };

  const handleConfirmCloneTemplate = async () => {
    if (!cloneTemplateTarget?.id || !cloneStudentId) return;

    setCloningTemplate(true);
    setCloneTemplateError("");

    try {
      const created = await cloneWorkoutPlanTemplate(
        cloneTemplateTarget.id,
        { alunoId: cloneStudentId },
        tenantId,
      );
      const normalized = normalizeWorkoutPlan(created);
      if (cloneStudentId === selectedStudentId) {
        setWorkouts((prev) => [normalized, ...prev]);
      }

      const targetStudent = students.find(
        (student) => student.id === cloneStudentId,
      );
      setMessage(
        `Template "${cloneTemplateTarget.title}" clonado para ${
          targetStudent?.fullName || "aluno"
        }.`,
      );
      closeCloneTemplateModal();
    } catch (error) {
      setCloneTemplateError(
        error?.message || "Nao foi possivel clonar o template.",
      );
    } finally {
      setCloningTemplate(false);
    }
  };

  const handleSaveWorkout = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!selectedStudentId) {
      setMessage("Selecione um aluno para vincular o treino");
      return;
    }

    if (!workoutForm.title.trim() || currentWorkoutExercises.length === 0) {
      setMessage("Preencha o titulo e adicione exercicios");
      return;
    }

    if (!editingWorkoutId && saveAsTemplate && !templateName.trim()) {
      setMessage("Informe o nome do template");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        alunoId: selectedStudentId,
        title: workoutForm.title,
        objective: buildWorkoutObjective(
          workoutForm.objective,
          workoutForm.phase,
        ),
        isActive: true,
        items: currentWorkoutExercises.map((exercise, index) => ({
          exerciseName: exercise.exerciseName,
          sets: Number(exercise.sets),
          reps: String(exercise.reps),
          restSeconds: exercise.restSeconds
            ? Number(exercise.restSeconds)
            : null,
          orderIndex: index,
        })),
      };

      if (!editingWorkoutId && saveAsTemplate) {
        payload.saveAsTemplate = true;
        payload.templateName = templateName.trim() || workoutForm.title.trim();
      }

      const persistWorkout = editingWorkoutId
        ? await updateWorkoutPlan(
            editingWorkoutId,
            payload,
            tenantId,
          )
        : await createWorkoutPlan(payload, tenantId);

      const normalized = normalizeWorkoutPlan(persistWorkout);

      setWorkouts((prev) =>
        editingWorkoutId
          ? prev.map((workout) =>
              workout.id === editingWorkoutId ? normalized : workout,
            )
          : [normalized, ...prev],
      );
      resetWorkoutForm();
      setMessage(
        editingWorkoutId
          ? `Treino "${persistWorkout.title}" atualizado com sucesso.`
          : saveAsTemplate
            ? `Treino "${persistWorkout.title}" salvo e template criado com sucesso.`
            : `Treino "${persistWorkout.title}" salvo para ${selectedStudent?.fullName || "aluno"}`,
      );
    } catch (error) {
      setMessage(error?.message || "Nao foi possivel salvar treino");
    } finally {
      setSaving(false);
    }
  };

  const handleEditWorkout = (workout) => {
    setEditingWorkoutId(workout.id);
    setSaveAsTemplate(false);
    setTemplateName("");
    setWorkoutForm({
      title: workout.title || "",
      objective: stripPhaseFromObjective(workout.objective),
      phase: inferPhase(workout.objective),
    });
    const sourceExercises = Array.isArray(workout.exercises)
      ? workout.exercises
      : Array.isArray(workout.items)
        ? workout.items
        : [];
    setCurrentWorkoutExercises(
      sourceExercises.map((exercise, index) => ({
        ...exercise,
        id: exercise.id || `exercise-${workout.id}-${index}`,
      })),
    );
    setMessage(`Editando treino: ${workout.title}`);
  };

  const handleCloneWorkout = (workout) => {
    setEditingWorkoutId("");
    setSaveAsTemplate(false);
    setTemplateName("");
    setWorkoutForm({
      title: `${workout.title} (Cópia)`,
      objective: workout.objective,
      phase: workout.phase,
    });
    const sourceExercises = Array.isArray(workout.exercises)
      ? workout.exercises
      : Array.isArray(workout.items)
        ? workout.items
        : [];
    const exercisesWithIds = sourceExercises.map((ex) => ({
      ...ex,
      id: Math.random().toString(36).substr(2, 9),
    }));
    setCurrentWorkoutExercises(exercisesWithIds);
  };

  const handleScheduleSessionChange = (sessionId, field, value) => {
    setScheduleSessions((current) =>
      current.map((session) =>
        session.id === sessionId ? { ...session, [field]: value } : session,
      ),
    );
  };

  const handleAddScheduleSession = () => {
    setScheduleSessions((current) => [...current, createEmptySession()]);
  };

  const handleRemoveScheduleSession = (sessionId) => {
    setScheduleSessions((current) =>
      current.filter((session) => session.id !== sessionId),
    );
  };

  const handleSubmitSchedule = async () => {
    if (!scheduleTarget?.id) {
      setScheduleError("Selecione um plano valido para agendar as sessoes.");
      return;
    }

    const normalizedSessions = scheduleSessions
      .filter((session) => !session.agendaId)
      .map((session) => {
      const startsAt = createLocalOffsetISOString(
        session.date,
        session.startsAtTime,
      );
      const endsAt = createLocalOffsetISOString(session.date, session.endsAtTime);
      const recurrenceUntil =
        session.recurrence !== "NONE" && session.recurrenceUntilDate
          ? createLocalOffsetISOString(session.recurrenceUntilDate, "23:59", "59")
          : null;

      return {
        title: session.title.trim(),
        startsAt,
        endsAt,
        recurrence: session.recurrence,
        recurrenceUntil,
      };
      });

    if (normalizedSessions.length === 0) {
      setScheduleError("Adicione pelo menos uma nova sessao para salvar a agenda.");
      return;
    }

    const invalidSession = normalizedSessions.find(
      (session) =>
        !session.title ||
        !session.startsAt ||
        !session.endsAt ||
        (session.recurrence !== "NONE" && !session.recurrenceUntil),
    );

    if (invalidSession) {
      setScheduleError(
        "Preencha titulo, data, horario e data final para todas as sessoes recorrentes.",
      );
      return;
    }

    setScheduling(true);
    setScheduleError("");

    try {
      const response = await scheduleWorkoutPlan(
        scheduleTarget.id,
        {
          replaceExisting: replaceExistingSchedule,
          sessions: normalizedSessions,
        },
        tenantId,
      );

      const nextSchedule = Array.isArray(response?.schedule)
        ? response.schedule
        : Array.isArray(response?.sessions)
          ? response.sessions
          : normalizedSessions;

      setWorkouts((current) =>
        current.map((workout) =>
          workout.id === scheduleTarget.id
            ? { ...workout, schedule: nextSchedule }
            : workout,
        ),
      );
      setMessage(`Agenda atualizada para o treino "${scheduleTarget.title}".`);
      closeScheduleModal();
    } catch (error) {
      setScheduleError(
        error?.status === 409
          ? "Ja existe treino agendado para outro aluno nesse horario. Escolha outro horario."
          : error?.message || "Nao foi possivel agendar as sessoes.",
      );
    } finally {
      setScheduling(false);
    }
  };

  const handleUpdateExistingSession = async (sessionDraft) => {
    if (!sessionDraft?.agendaId) {
      return;
    }

    const startsAt = createLocalOffsetISOString(
      sessionDraft.date,
      sessionDraft.startsAtTime,
    );
    const endsAt = createLocalOffsetISOString(
      sessionDraft.date,
      sessionDraft.endsAtTime,
    );

    if (!sessionDraft.title.trim() || !startsAt || !endsAt) {
      setScheduleError("Preencha titulo, data e horarios validos para editar a sessao.");
      return;
    }

    setUpdatingSessionId(sessionDraft.id);
    setScheduleError("");

    try {
      const updated = await updateAgendaEvent(
        sessionDraft.agendaId,
        {
          title: sessionDraft.title.trim(),
          startsAt,
          endsAt,
          recurrence:
            sessionDraft.recurrence && sessionDraft.recurrence !== "NONE"
              ? sessionDraft.recurrence
              : null,
          recurrenceUntil:
            sessionDraft.recurrence !== "NONE" && sessionDraft.recurrenceUntilDate
              ? createLocalOffsetISOString(
                  sessionDraft.recurrenceUntilDate,
                  "23:59",
                  "59",
                )
              : null,
        },
        tenantId,
      );

      setScheduleSessions((current) =>
        current.map((session) =>
          session.id === sessionDraft.id
            ? toEditableSession(updated, sessionDraft.title, 0)
            : session,
        ),
      );
      setWorkouts((current) =>
        current.map((workout) =>
          workout.id === scheduleTarget.id
            ? {
                ...workout,
                schedule: workout.schedule.map((session) =>
                  session.id === sessionDraft.agendaId ? updated : session,
                ),
              }
            : workout,
        ),
      );
      setMessage(`Sessao "${sessionDraft.title}" atualizada com sucesso.`);
    } catch (error) {
      setScheduleError(
        error?.status === 409
          ? "Ja existe treino agendado para outro aluno nesse horario. Escolha outro horario."
          : error?.message || "Nao foi possivel editar a sessao.",
      );
    } finally {
      setUpdatingSessionId("");
    }
  };

  const handleDeleteExistingSession = async (sessionDraft) => {
    const targetAgendaId = sessionDraft?.agendaId || sessionDraft?.id;
    if (!targetAgendaId) {
      handleRemoveScheduleSession(sessionDraft.id);
      return;
    }

    setDeletingSessionId(sessionDraft.id);
    setScheduleError("");

    try {
      await deleteAgendaEvent(targetAgendaId, tenantId);
      setScheduleSessions((current) =>
        current.filter((session) => session.id !== sessionDraft.id),
      );
      setWorkouts((current) =>
        current.map((workout) =>
          workout.id === scheduleTarget.id
            ? {
                ...workout,
                schedule: workout.schedule.filter(
                  (session) => session.id !== targetAgendaId,
                ),
              }
            : workout,
        ),
      );
      setMessage(`Sessao "${sessionDraft.title}" removida com sucesso.`);
    } catch (error) {
      setScheduleError(error?.message || "Nao foi possivel excluir a sessao.");
    } finally {
      setDeletingSessionId("");
    }
  };

  return (
    <main className="space-y-6 pb-10">
      <article className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6">
        <h2 className="font-title text-2xl text-[#d9c179]">
          {editingWorkoutId ? "Editar Treino" : "Criar Novo Treino"}
        </h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block text-sm text-white/70">
            Aluno
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none transition focus:border-[#d9b341]/50"
            >
              <option value="">Selecione um aluno</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.fullName}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm">
            <p className="text-white/50">Treino sera vinculado a</p>
            <p className="mt-1 font-semibold text-[#d9c179]">
              {selectedStudent?.fullName || "Nenhum aluno selecionado"}
            </p>
          </div>
        </div>

        {message ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/75">
            {message}
          </div>
        ) : null}

        <form className="mt-6 space-y-5" onSubmit={handleSaveWorkout}>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="block text-sm text-white/70">
              Título do treino
              <input
                type="text"
                value={workoutForm.title}
                onChange={(e) =>
                  setWorkoutForm((prev) => ({ ...prev, title: e.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none transition placeholder:text-white/30 focus:border-[#d9b341]/50"
                placeholder="Ex: Peito e Costas"
              />
            </label>

            <label className="block text-sm text-white/70">
              Objetivo
              <input
                type="text"
                value={workoutForm.objective}
                onChange={(e) =>
                  setWorkoutForm((prev) => ({
                    ...prev,
                    objective: e.target.value,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none transition placeholder:text-white/30 focus:border-[#d9b341]/50"
                placeholder="Ex: Força e Hipertrofia"
              />
            </label>

            <label className="block text-sm text-white/70">
              Fase de Treino
              <select
                value={workoutForm.phase}
                onChange={(e) =>
                  setWorkoutForm((prev) => ({ ...prev, phase: e.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none transition focus:border-[#d9b341]/50"
              >
                <option>Hipertrofia</option>
                <option>Força</option>
                <option>Definição</option>
                <option>Resistência</option>
              </select>
            </label>
          </div>

          {canUseTemplates && !editingWorkoutId ? (
            <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/70">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={saveAsTemplate}
                  onChange={(event) =>
                    handleToggleSaveAsTemplate(event.target.checked)
                  }
                />
                Salvar como template
              </label>

              {saveAsTemplate ? (
                <label className="mt-3 block text-sm text-white/70">
                  Nome do template
                  <input
                    type="text"
                    value={templateName}
                    onChange={(event) => setTemplateName(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none"
                    placeholder="Ex: Treino funcional avançado"
                  />
                </label>
              ) : null}
            </div>
          ) : null}

          <div>
            <p className="mb-3 text-sm font-semibold text-white/70">
              Exercícios ({currentWorkoutExercises.length})
            </p>
            <div className="space-y-2">
              {currentWorkoutExercises.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-8 text-center">
                  <AlertCircle
                    className="mx-auto mb-3 text-white/40"
                    size={24}
                  />
                  <p className="text-sm text-white/60">
                    Clique em "Adicionar exercício" para começar
                  </p>
                </div>
              ) : (
                currentWorkoutExercises.map((exercise) => (
                  <WorkoutItem
                    key={exercise.id}
                    exercise={exercise}
                    onRemove={handleRemoveExercise}
                    onUpdate={handleUpdateExercise}
                  />
                ))
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-4">
            {canUseTemplates ? (
              <button
                type="button"
                onClick={openTemplatesModal}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-semibold text-white/75 transition hover:border-white/20"
              >
                Importar de template
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setShowExerciseModal(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-[#d9b341]/50 bg-[#d9b341]/10 px-6 py-3 font-semibold text-[#d9c179] transition hover:bg-[#d9b341]/20"
            >
              <Plus size={16} />
              Adicionar Exercício
            </button>

            <button
              type="submit"
              disabled={saving || !selectedStudentId}
              className="flex-1 rounded-xl bg-[#d9b341] px-6 py-3 font-semibold text-black transition hover:brightness-110 md:flex-none"
            >
              {saving
                ? "Salvando..."
                : editingWorkoutId
                  ? "Atualizar Treino"
                  : "Salvar Treino"}
            </button>

            {editingWorkoutId ? (
              <button
                type="button"
                onClick={resetWorkoutForm}
                className="rounded-xl border border-white/10 px-6 py-3 font-semibold text-white/70 transition hover:border-white/20"
              >
                Cancelar edicao
              </button>
            ) : null}
          </div>
        </form>
      </article>

      {canUseTemplates ? (
        <article className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-title text-2xl text-[#d9c179]">
                Biblioteca de Templates
              </h2>
              <p className="mt-2 text-sm text-white/60">
                Salve treinos como templates e reutilize na criacao de novos planos.
              </p>
              <p className="mt-2 text-xs text-white/45">
                {templates.length} template(s) carregado(s)
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={openTemplatesModal}
                className="rounded-xl border border-[#d9b341]/50 bg-[#d9b341]/10 px-5 py-3 text-sm font-semibold text-[#d9c179] transition hover:bg-[#d9b341]/20"
              >
                Abrir biblioteca
              </button>
              <button
                type="button"
                onClick={loadTemplates}
                className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-white/70 transition hover:border-white/20"
              >
                Atualizar
              </button>
            </div>
          </div>
        </article>
      ) : null}

      <article className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6">
        <h2 className="font-title text-2xl text-[#d9c179]">
          Treinos do Aluno ({workouts.length})
        </h2>

        <div className="mt-5 space-y-3">
          {workouts.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/30 px-6 py-8 text-center">
              <Dumbbell className="mx-auto mb-3 text-white/40" size={32} />
              <p className="text-white/60">
                Nenhum treino criado ainda. Crie seu primeiro treino acima!
              </p>
            </div>
          ) : (
            workouts.map((workout) => (
              <div
                key={workout.id}
                className="rounded-2xl border border-white/10 bg-black/30 p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-white">{workout.title}</p>
                    <p className="mt-1 text-sm text-white/55">
                      {workout.objective}
                    </p>
                    <p className="mt-1 text-xs text-white/40">
                      {workout.exercises.length} exercícios • Fase:{" "}
                      {workout.phase}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditWorkout(workout)}
                      className="rounded-lg border border-white/10 p-2 text-white/60 transition hover:text-[#d9b341]"
                      title="Editar treino"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => openScheduleModal(workout)}
                      className="rounded-lg border border-white/10 p-2 text-white/60 transition hover:text-[#d9b341]"
                      title="Agendar treinos"
                    >
                      <CalendarDays size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCloneWorkout(workout)}
                      className="rounded-lg border border-white/10 p-2 text-white/60 transition hover:text-[#d9b341]"
                      title="Clonar treino"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-white/10 p-2 text-white/60 transition hover:text-red-400"
                      title="Deletar treino"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                  {workout.exercises.map((exercise) => (
                    <div key={exercise.id} className="text-sm text-white/70">
                      <span className="font-semibold text-white">
                        {exercise.exerciseName}
                      </span>{" "}
                      • {exercise.sets}x{exercise.reps}
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#d9c179]">
                    <Clock3 size={16} />
                    Proximas sessoes
                  </div>

                  <div className="mt-3 space-y-2">
                    {workout.schedule.length === 0 ? (
                      <p className="text-sm text-white/55">
                        Nenhuma sessao agendada ainda. Clique no calendario para montar a agenda deste plano.
                      </p>
                    ) : (
                      workout.schedule
                        .slice()
                        .sort((left, right) => new Date(left.startsAt) - new Date(right.startsAt))
                        .slice(0, 5)
                        .map((session) => (
                          <div
                            key={session.id || `${workout.id}-${session.startsAt}`}
                            className="rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white/70"
                          >
                            <p className="font-semibold text-white">{session.title}</p>
                            <p className="mt-1 text-white/55">
                              {new Intl.DateTimeFormat("pt-BR", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              }).format(new Date(session.startsAt))}
                            </p>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </article>

      {showExerciseModal && (
        <ExerciseSelector
          onAdd={handleAddExerciseToWorkout}
          onClose={() => setShowExerciseModal(false)}
        />
      )}

      {showScheduleModal && scheduleTarget ? (
        <ScheduleSessionModal
          workout={scheduleTarget}
          loading={loadingScheduleDetails}
          saving={scheduling}
          error={scheduleError}
          updatingSessionId={updatingSessionId}
          deletingSessionId={deletingSessionId}
          replaceExisting={replaceExistingSchedule}
          sessions={scheduleSessions}
          onClose={closeScheduleModal}
          onToggleReplaceExisting={setReplaceExistingSchedule}
          onSessionChange={handleScheduleSessionChange}
          onAddSession={handleAddScheduleSession}
          onRemoveSession={handleRemoveScheduleSession}
          onUpdateExistingSession={handleUpdateExistingSession}
          onDeleteExistingSession={handleDeleteExistingSession}
          onSubmit={handleSubmitSchedule}
        />
      ) : null}

      {showTemplatesModal ? (
        <TemplateLibraryModal
          templates={templates}
          loading={loadingTemplates}
          error={templatesError}
          previewTemplateId={previewTemplateId}
          onTogglePreview={(templateId) =>
            setPreviewTemplateId((current) =>
              current === templateId ? "" : templateId,
            )
          }
          onInsert={handleInsertTemplate}
          onClone={(template) => {
            openCloneTemplateModal(template);
          }}
          onClose={closeTemplatesModal}
        />
      ) : null}

      {cloneTemplateTarget ? (
        <CloneTemplateModal
          template={cloneTemplateTarget}
          students={students}
          selectedStudentId={cloneStudentId}
          onSelectStudent={setCloneStudentId}
          onClose={closeCloneTemplateModal}
          onConfirm={handleConfirmCloneTemplate}
          loading={cloningTemplate}
          error={cloneTemplateError}
        />
      ) : null}
    </main>
  );
}
