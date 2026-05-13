import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  Copy,
  Dumbbell,
  X,
  AlertCircle,
  CalendarDays,
  Clock3,
  Bookmark,
  Play,
} from "lucide-react";
import {
  createWorkoutPlan,
  deleteWorkoutPlan,
  deleteAgendaEvent,
  getWorkoutPlanDetails,
  listStudents,
  listWorkoutPlans,
  scheduleWorkoutPlan,
  updateAgendaEvent,
  updateWorkoutPlan,
  listCustomExercises,
  createCustomExercise,
  updateCustomExercise,
  deleteCustomExercise,
  listWorkoutTemplates,
  createWorkoutTemplate,
  updateWorkoutTemplate,
  deleteWorkoutTemplate,
} from "../lib/api.js";
import { useTenant } from "../contexts/TenantContext.jsx";
import { useI18n } from "../contexts/I18nContext.jsx";

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
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-4xl border border-white/10 bg-[#0a0a0a] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/45">
              {t(
                "WORKOUT_MODAL_SCHEDULE_BADGE_THIAGOIAZZETTI",
                "Agendar treinos",
              )}
            </p>
            <h2 className="mt-2 font-title text-3xl text-[#b5f03c]">
              {workout.title}
            </h2>
            <p className="mt-2 text-sm text-white/65">
              {t(
                "WORKOUT_MODAL_SCHEDULE_SUBTITLE_THIAGOIAZZETTI",
                "Defina dias, horarios e recorrencia das proximas sessoes desse plano.",
              )}
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
          {t(
            "WORKOUT_MODAL_REPLACE_SCHEDULE_THIAGOIAZZETTI",
            "Substituir agenda existente deste plano",
          )}
        </label>

        {loading ? (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-sm text-white/65">
            {t(
              "WORKOUT_MODAL_LOADING_SCHEDULE_THIAGOIAZZETTI",
              "Carregando agenda atual do plano...",
            )}
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
                  {t("WORKOUT_MODAL_SESSION_LABEL_THIAGOIAZZETTI", "Sessao")}{" "}
                  {index + 1}
                </p>
                {sessions.length > 1 || session.agendaId ? (
                  <button
                    type="button"
                    onClick={() =>
                      session.agendaId
                        ? onDeleteExistingSession(session)
                        : onRemoveSession(session.id)
                    }
                    disabled={
                      saving || loading || deletingSessionId === session.id
                    }
                    className="rounded-lg border border-white/10 p-2 text-white/60 transition hover:text-red-400 disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                  </button>
                ) : null}
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <label className="text-sm text-white/70 xl:col-span-3">
                  {t(
                    "WORKOUT_MODAL_SESSION_TITLE_LABEL_THIAGOIAZZETTI",
                    "Titulo da sessao",
                  )}
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
                  {t("WORKOUT_MODAL_SESSION_DAY_LABEL_THIAGOIAZZETTI", "Dia")}
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
                  {t(
                    "WORKOUT_MODAL_SESSION_START_LABEL_THIAGOIAZZETTI",
                    "Inicio",
                  )}
                  <input
                    type="time"
                    value={session.startsAtTime}
                    onChange={(event) =>
                      onSessionChange(
                        session.id,
                        "startsAtTime",
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none"
                    disabled={saving || loading}
                  />
                </label>

                <label className="text-sm text-white/70">
                  {t("WORKOUT_MODAL_SESSION_END_LABEL_THIAGOIAZZETTI", "Fim")}
                  <input
                    type="time"
                    value={session.endsAtTime}
                    onChange={(event) =>
                      onSessionChange(
                        session.id,
                        "endsAtTime",
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none"
                    disabled={saving || loading}
                  />
                </label>

                <label className="text-sm text-white/70">
                  {t(
                    "WORKOUT_MODAL_SESSION_RECURRENCE_LABEL_THIAGOIAZZETTI",
                    "Recorrencia",
                  )}
                  <select
                    value={session.recurrence}
                    onChange={(event) =>
                      onSessionChange(
                        session.id,
                        "recurrence",
                        event.target.value,
                      )
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
                  {t(
                    "WORKOUT_MODAL_SESSION_UNTIL_LABEL_THIAGOIAZZETTI",
                    "Repetir ate",
                  )}
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
                    disabled={
                      saving || loading || session.recurrence === "NONE"
                    }
                  />
                </label>
              </div>

              {session.agendaId ? (
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => onUpdateExistingSession(session)}
                    disabled={
                      saving || loading || updatingSessionId === session.id
                    }
                    className="rounded-xl border border-[#b5f03c]/50 bg-[#b5f03c]/10 px-4 py-2 text-sm font-semibold text-[#b5f03c] transition hover:bg-[#b5f03c]/20 disabled:opacity-50"
                  >
                    {updatingSessionId === session.id
                      ? t(
                          "WORKOUT_MODAL_SAVING_SESSION_THIAGOIAZZETTI",
                          "Salvando sessao...",
                        )
                      : t(
                          "WORKOUT_MODAL_SAVE_SESSION_THIAGOIAZZETTI",
                          "Salvar sessao",
                        )}
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteExistingSession(session)}
                    disabled={
                      saving || loading || deletingSessionId === session.id
                    }
                    className="rounded-xl border border-red-400/45 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
                  >
                    {deletingSessionId === session.id
                      ? t(
                          "WORKOUT_MODAL_DELETING_SESSION_THIAGOIAZZETTI",
                          "Excluindo...",
                        )
                      : t(
                          "WORKOUT_MODAL_DELETE_SESSION_THIAGOIAZZETTI",
                          "Excluir sessao",
                        )}
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
            className="rounded-xl border border-[#b5f03c]/50 bg-[#b5f03c]/10 px-4 py-3 text-sm font-semibold text-[#b5f03c] transition hover:bg-[#b5f03c]/20 disabled:opacity-50"
          >
            <Plus size={16} className="mr-2 inline-block" />
            {t("WORKOUT_MODAL_ADD_SESSION_THIAGOIAZZETTI", "Adicionar sessao")}
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={saving || loading}
            className="rounded-xl bg-[#b5f03c] px-5 py-3 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-60"
          >
            {saving
              ? t("WORKOUT_MODAL_SCHEDULING_THIAGOIAZZETTI", "Agendando...")
              : t(
                  "WORKOUT_MODAL_SAVE_SCHEDULE_THIAGOIAZZETTI",
                  "Salvar agenda",
                )}
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

// Templates de treino pré-definidos
const trainingTemplates = [
  {
    name: "Full Body A",
    description: "Treino completo focado em força",
    exercises: [
      { exerciseName: "Agachamento livre", sets: 4, reps: 6, restSeconds: 120 },
      { exerciseName: "Supino reto", sets: 4, reps: 6, restSeconds: 120 },
      { exerciseName: "Barra fixa", sets: 3, reps: 8, restSeconds: 90 },
    ],
  },
  {
    name: "Full Body B",
    description: "Treino completo com foco em hipertrofia",
    exercises: [
      { exerciseName: "Leg press", sets: 4, reps: 8, restSeconds: 90 },
      { exerciseName: "Supino inclinado", sets: 4, reps: 8, restSeconds: 90 },
      { exerciseName: "Remada curvada", sets: 4, reps: 8, restSeconds: 90 },
    ],
  },
  {
    name: "Upper Body",
    description: "Focado em tronco e braços",
    exercises: [
      { exerciseName: "Supino reto", sets: 4, reps: 6, restSeconds: 120 },
      { exerciseName: "Remada alta", sets: 4, reps: 8, restSeconds: 90 },
      {
        exerciseName: "Desenvolvimento com halteres",
        sets: 3,
        reps: 8,
        restSeconds: 90,
      },
    ],
  },
];

function ExerciseSelector({
  onAdd,
  onClose,
  exerciseLibrary,
  tenantId,
  onExerciseCreated,
  initialExercise,
  isEditing,
}) {
  const { t } = useI18n();
  const [selectedGroup, setSelectedGroup] = useState("Peito");
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    exerciseName: "",
    equipment: "",
    sets: 3,
    reps: 10,
    restSeconds: 60,
    videoUrl: "",
  });

  useEffect(() => {
    if (!initialExercise) {
      setFormData({
        exerciseName: "",
        equipment: "",
        sets: 3,
        reps: 10,
        restSeconds: 60,
        videoUrl: "",
      });
      setIsCreatingNew(false);
      return;
    }

    setFormData({
      exerciseName: initialExercise.exerciseName || "",
      equipment: initialExercise.equipment || "",
      sets: Number(initialExercise.sets ?? 3),
      reps: Number(initialExercise.reps ?? 10),
      restSeconds: Number(initialExercise.restSeconds ?? 60),
      videoUrl: initialExercise.videoUrl || "",
    });
    setIsCreatingNew(false);

    const matchedGroup = Object.entries(exerciseLibrary).find(([, items]) =>
      items.some((exercise) => exercise.name === initialExercise.exerciseName),
    );

    if (matchedGroup?.[0]) {
      setSelectedGroup(matchedGroup[0]);
    }
  }, [initialExercise, exerciseLibrary]);

  const filteredExercises = exerciseLibrary[selectedGroup] || [];

  const handleAddExercise = async (e) => {
    e.preventDefault();
    if (formData.exerciseName.trim()) {
      // Se for um exercício novo, salvar no backend primeiro
      if (isCreatingNew && formData.equipment.trim()) {
        setIsSaving(true);
        try {
          const newExercise = await createCustomExercise(
            {
              name: formData.exerciseName.trim(),
              muscleGroup: selectedGroup,
              equipment: formData.equipment.trim(),
            },
            tenantId,
          );
          onExerciseCreated?.(newExercise);
        } catch (error) {
          console.error("Erro ao salvar exercício customizado:", error);
        } finally {
          setIsSaving(false);
        }
      }

      onAdd(formData);
      setFormData({
        exerciseName: "",
        equipment: "",
        sets: 3,
        reps: 10,
        restSeconds: 60,
        videoUrl: "",
      });
      setIsCreatingNew(false);
    }
  };

  const handleSelectChange = (e) => {
    const value = e.target.value;
    if (value === "__create_new__") {
      setIsCreatingNew(true);
      setFormData((prev) => ({
        ...prev,
        exerciseName: "",
        equipment: "",
        videoUrl: "",
      }));
    } else {
      setIsCreatingNew(false);
      setFormData((prev) => ({
        ...prev,
        exerciseName: value,
        equipment: "",
        videoUrl: "",
      }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur">
      <div className="w-full max-w-2xl rounded-4xl border border-white/10 bg-[#0a0a0a] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-title text-2xl text-[#b5f03c]">
            {isEditing
              ? t(
                  "WORKOUT_MODAL_EDIT_EXERCISE_TITLE_THIAGOIAZZETTI",
                  "Editar Exercicio",
                )
              : t(
                  "WORKOUT_MODAL_ADD_EXERCISE_TITLE_THIAGOIAZZETTI",
                  "Adicionar Exercicio",
                )}
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
            {t(
              "WORKOUT_MODAL_MUSCLE_GROUP_LABEL_THIAGOIAZZETTI",
              "Grupo Muscular",
            )}
            <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
              {Object.keys(exerciseLibrary).map((group) => (
                <button
                  key={group}
                  type="button"
                  onClick={() => {
                    if (!isEditing) {
                      setSelectedGroup(group);
                    }
                  }}
                  disabled={isEditing}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    selectedGroup === group
                      ? "border border-[#b5f03c]/50 bg-[#b5f03c]/15 text-[#b5f03c]"
                      : "border border-white/10 text-white/60 hover:border-white/20"
                  }`}
                >
                  {group}
                </button>
              ))}
            </div>
          </label>

          {isEditing ? (
            <label className="block text-sm text-white/70">
              {t("WORKOUT_MODAL_EXERCISE_LABEL_THIAGOIAZZETTI", "Exercicio")}
              <input
                type="text"
                value={formData.exerciseName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    exerciseName: e.target.value,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none transition focus:border-[#b5f03c]/50"
              />
            </label>
          ) : (
            <label className="block text-sm text-white/70">
              {t("WORKOUT_MODAL_EXERCISE_LABEL_THIAGOIAZZETTI", "Exercicio")}
              <select
                value={isCreatingNew ? "__create_new__" : formData.exerciseName}
                onChange={handleSelectChange}
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none transition focus:border-[#b5f03c]/50"
              >
                <option value="">
                  {t(
                    "WORKOUT_MODAL_SELECT_EXERCISE_THIAGOIAZZETTI",
                    "Selecione um exercicio",
                  )}
                </option>
                {filteredExercises.map((ex) => (
                  <option key={ex.name} value={ex.name}>
                    {ex.name} ({ex.equipment})
                  </option>
                ))}
                <option value="__create_new__" className="font-semibold">
                  +{" "}
                  {t(
                    "WORKOUT_MODAL_CREATE_NEW_EXERCISE_THIAGOIAZZETTI",
                    "Criar novo exercicio",
                  )}
                </option>
              </select>
            </label>
          )}

          {isCreatingNew && (
            <>
              <label className="block text-sm text-white/70">
                {t(
                  "WORKOUT_MODAL_EXERCISE_NAME_THIAGOIAZZETTI",
                  "Nome do exercicio",
                )}
                <input
                  type="text"
                  placeholder={t(
                    "WORKOUT_MODAL_EXERCISE_NAME_PLACEHOLDER_THIAGOIAZZETTI",
                    "Ex: Flexão com peso",
                  )}
                  value={formData.exerciseName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      exerciseName: e.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none transition placeholder:text-white/30 focus:border-[#b5f03c]/50"
                  autoFocus
                />
              </label>

              <label className="block text-sm text-white/70">
                {t("WORKOUT_MODAL_EQUIPMENT_THIAGOIAZZETTI", "Equipamento")}
                <input
                  type="text"
                  placeholder={t(
                    "WORKOUT_MODAL_EQUIPMENT_PLACEHOLDER_THIAGOIAZZETTI",
                    "Ex: Barra, Halteres, Máquina",
                  )}
                  value={formData.equipment}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      equipment: e.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none transition placeholder:text-white/30 focus:border-[#b5f03c]/50"
                />
              </label>
            </>
          )}

          <label className="block text-sm text-white/70">
            {t(
              "WORKOUT_MODAL_VIDEO_URL_LABEL_THIAGOIAZZETTI",
              "Link do video (opcional)",
            )}
            <input
              type="url"
              placeholder="https://youtube.com/watch?v=..."
              value={formData.videoUrl}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  videoUrl: e.target.value,
                }))
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none transition placeholder:text-white/30 focus:border-[#b5f03c]/50"
            />
          </label>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="block text-sm text-white/70">
              {t("WORKOUT_MODAL_SETS_LABEL_THIAGOIAZZETTI", "Series")}
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
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none transition focus:border-[#b5f03c]/50"
              />
            </label>

            <label className="block text-sm text-white/70">
              {t("WORKOUT_MODAL_REPS_LABEL_THIAGOIAZZETTI", "Repeticoes")}
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
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none transition focus:border-[#b5f03c]/50"
              />
            </label>

            <label className="block text-sm text-white/70">
              {t(
                "WORKOUT_MODAL_REST_LABEL_THIAGOIAZZETTI",
                "Descanso (segundos)",
              )}
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
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none transition focus:border-[#b5f03c]/50"
              />
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 rounded-xl bg-[#b5f03c] px-4 py-3 font-semibold text-black transition hover:brightness-110 disabled:opacity-50"
            >
              {isSaving
                ? t(
                    "WORKOUT_MODAL_SAVING_EXERCISE_THIAGOIAZZETTI",
                    "Salvando...",
                  )
                : isEditing
                  ? t(
                      "WORKOUT_MODAL_SAVE_EXERCISE_BUTTON_THIAGOIAZZETTI",
                      "Salvar alteracoes",
                    )
                  : t(
                      "WORKOUT_MODAL_ADD_EXERCISE_BUTTON_THIAGOIAZZETTI",
                      "Adicionar exercicio",
                    )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-white/10 px-4 py-3 font-semibold text-white/70 transition hover:border-white/20"
            >
              {t("ADMIN_DASH_CANCEL_THIAGOIAZZETTI", "Cancelar")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function WorkoutItem({ exercise, onRemove, onEdit }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
      <div className="flex-1">
        <p className="font-semibold text-white">{exercise.exerciseName}</p>
        <p className="text-sm text-white/60">
          {exercise.sets}x{exercise.reps} •{" "}
          {t("CLIENT_DASH_REST_LABEL_THIAGOIAZZETTI", "Descanso")}:{" "}
          {exercise.restSeconds
            ? `${exercise.restSeconds}s`
            : t("CLIENT_DASH_REST_FREE_THIAGOIAZZETTI", "livre")}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onEdit(exercise.id)}
          className="rounded-lg border border-white/10 p-2 text-white/60 transition hover:text-[#b5f03c]"
        >
          <Edit2 size={16} />
        </button>
        {exercise.videoUrl ? (
          <a
            href={exercise.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={t(
              "WORKOUT_ITEM_WATCH_VIDEO_THIAGOIAZZETTI",
              "Ver video do exercicio",
            )}
            className="rounded-lg border border-white/10 p-2 text-white/60 transition hover:border-[#b5f03c]/50 hover:text-[#b5f03c]"
          >
            <Play size={16} />
          </a>
        ) : null}
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
  const { t } = useI18n();
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [workouts, setWorkouts] = useState([]);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [editingWorkoutExerciseId, setEditingWorkoutExerciseId] = useState("");
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [currentWorkoutExercises, setCurrentWorkoutExercises] = useState([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingWorkoutId, setEditingWorkoutId] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [loadingScheduleDetails, setLoadingScheduleDetails] = useState(false);
  const [scheduleError, setScheduleError] = useState("");
  const [scheduleTarget, setScheduleTarget] = useState(null);
  const [replaceExistingSchedule, setReplaceExistingSchedule] = useState(true);
  const [scheduleSessions, setScheduleSessions] = useState([
    createEmptySession(),
  ]);
  const [updatingSessionId, setUpdatingSessionId] = useState("");
  const [deletingSessionId, setDeletingSessionId] = useState("");
  const [customExercises, setCustomExercises] = useState([]);
  const [workoutTemplates, setWorkoutTemplates] = useState([]);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState("");
  const [editingExerciseId, setEditingExerciseId] = useState("");
  const [showCustomExercises, setShowCustomExercises] = useState(false);
  const [customExerciseForm, setCustomExerciseForm] = useState({
    name: "",
    muscleGroup: "",
    equipment: "",
  });
  const [workoutForm, setWorkoutForm] = useState({
    title: "",
    objective: "",
    phase: "Hipertrofia",
  });

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId) || null,
    [students, selectedStudentId],
  );

  // Mesclar biblioteca de exercícios hardcoded com customizados
  const mergedExerciseLibrary = useMemo(() => {
    const merged = { ...exerciseLibrary };

    customExercises.forEach((exercise) => {
      const group = exercise.muscleGroup;
      if (!merged[group]) {
        merged[group] = [];
      }

      const exists = merged[group].some((ex) => ex.name === exercise.name);
      if (!exists) {
        merged[group].push({
          name: exercise.name,
          equipment: exercise.equipment,
        });
      }
    });

    return merged;
  }, [customExercises]);

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
      const sourceSessions = Array.isArray(details.schedule)
        ? details.schedule
        : [];
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
      setScheduleError(
        error?.message || "Nao foi possivel carregar a agenda deste plano.",
      );
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
    setEditingTemplateId("");
    setEditingWorkoutExerciseId("");
    setWorkoutForm({ title: "", objective: "", phase: "Hipertrofia" });
    setCurrentWorkoutExercises([]);
    setSaveAsTemplate(false);
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

          // Carregar exercícios customizados
          try {
            const exercises = await listCustomExercises(tenantId);
            setCustomExercises(Array.isArray(exercises) ? exercises : []);
          } catch (error) {
            console.error("Erro ao carregar exercícios customizados:", error);
          }

          // Carregar templates de treino
          try {
            const templates = await listWorkoutTemplates(tenantId);
            setWorkoutTemplates(Array.isArray(templates) ? templates : []);
          } catch (error) {
            console.error("Erro ao carregar templates de treino:", error);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(
            error?.message ||
              t(
                "WORKOUT_BUILDER_LOAD_STUDENTS_ERROR_THIAGOIAZZETTI",
                "Nao foi possivel carregar alunos",
              ),
          );
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
          setMessage(
            error?.message ||
              t(
                "WORKOUT_BUILDER_LOAD_WORKOUTS_ERROR_THIAGOIAZZETTI",
                "Nao foi possivel carregar treinos",
              ),
          );
        }
      }
    };

    loadWorkouts();

    return () => {
      cancelled = true;
    };
  }, [selectedStudentId, tenantId]);

  const handleAddExerciseToWorkout = (exercise) => {
    if (editingWorkoutExerciseId) {
      setCurrentWorkoutExercises((prev) =>
        prev.map((item) =>
          item.id === editingWorkoutExerciseId
            ? { ...item, ...exercise, id: editingWorkoutExerciseId }
            : item,
        ),
      );
      setEditingWorkoutExerciseId("");
    } else {
      const id = Math.random().toString(36).substr(2, 9);
      setCurrentWorkoutExercises((prev) => [...prev, { ...exercise, id }]);
    }
    setShowExerciseModal(false);
  };

  const handleEditExercise = (exerciseId) => {
    setEditingWorkoutExerciseId(exerciseId);
    setShowExerciseModal(true);
  };

  const handleRemoveExercise = (id) => {
    setCurrentWorkoutExercises((prev) => prev.filter((ex) => ex.id !== id));
    if (editingWorkoutExerciseId === id) {
      setEditingWorkoutExerciseId("");
    }
  };

  const handleApplyTemplate = (template) => {
    setEditingWorkoutId("");
    setWorkoutForm({
      title: template.name,
      objective: template.description,
      phase: "Hipertrofia",
    });
    const exercisesWithIds = template.exercises.map((ex) => ({
      ...ex,
      id: Math.random().toString(36).substr(2, 9),
    }));
    setCurrentWorkoutExercises(exercisesWithIds);
  };

  const handleSaveWorkout = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!selectedStudentId) {
      setMessage(
        t(
          "WORKOUT_BUILDER_SELECT_STUDENT_ERROR_THIAGOIAZZETTI",
          "Selecione um aluno para vincular o treino",
        ),
      );
      return;
    }

    if (!workoutForm.title.trim() || currentWorkoutExercises.length === 0) {
      setMessage(
        t(
          "WORKOUT_BUILDER_FORM_REQUIRED_THIAGOIAZZETTI",
          "Preencha o titulo e adicione exercicios",
        ),
      );
      return;
    }

    setSaving(true);
    try {
      // Se estamos editando um template, não criar/atualizar treino do aluno
      if (editingTemplateId) {
        const templatePayload = {
          title: workoutForm.title,
          objective: workoutForm.objective,
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

        try {
          const updatedTemplate = await updateWorkoutTemplate(
            editingTemplateId,
            templatePayload,
            tenantId,
          );
          setWorkoutTemplates((prev) =>
            prev.map((template) =>
              template.id === editingTemplateId ? updatedTemplate : template,
            ),
          );
          resetWorkoutForm();
          setMessage("Template atualizado com sucesso!");
          setSaving(false);
          return;
        } catch (error) {
          setMessage(
            error?.message || "Erro ao atualizar template. Tente novamente.",
          );
          setSaving(false);
          return;
        }
      }

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
          videoUrl: exercise.videoUrl || null,
          orderIndex: index,
        })),
      };

      const persistWorkout = editingWorkoutId
        ? await updateWorkoutPlan(editingWorkoutId, payload, tenantId)
        : await createWorkoutPlan(payload, tenantId);

      const normalized = normalizeWorkoutPlan(persistWorkout);

      // Se marcado "Salvar como template", criar template
      if (saveAsTemplate && !editingWorkoutId) {
        try {
          const templatePayload = {
            title: workoutForm.title,
            objective: workoutForm.objective,
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
          const newTemplate = await createWorkoutTemplate(
            templatePayload,
            tenantId,
          );
          setWorkoutTemplates((prev) => [newTemplate, ...prev]);
          setSaveAsTemplate(false);
        } catch (error) {
          console.error(
            "Erro ao salvar template:",
            error?.message || "Template não foi salvo",
          );
        }
      }

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
          ? `${t("WORKOUT_BUILDER_UPDATED_THIAGOIAZZETTI", "Treino atualizado com sucesso")}: "${persistWorkout.title}"`
          : `${t("WORKOUT_BUILDER_SAVED_THIAGOIAZZETTI", "Treino salvo para")} ${selectedStudent?.fullName || t("DIET_LIST_STUDENT_DEFAULT_THIAGOIAZZETTI", "aluno")}: "${persistWorkout.title}"`,
      );
    } catch (error) {
      setMessage(
        error?.message ||
          t(
            "WORKOUT_BUILDER_SAVE_ERROR_THIAGOIAZZETTI",
            "Nao foi possivel salvar treino",
          ),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEditWorkout = (workout) => {
    setEditingWorkoutId(workout.id);
    setEditingTemplateId("");
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
    setMessage(
      `${t("WORKOUT_BUILDER_EDITING_THIAGOIAZZETTI", "Editando treino")}: ${workout.title}`,
    );
  };

  const handleDeleteWorkout = async (workoutId) => {
    if (!window.confirm("Tem certeza que deseja deletar este treino?")) {
      return;
    }

    try {
      await deleteWorkoutPlan(workoutId, tenantId);
      setWorkouts((prev) => prev.filter((workout) => workout.id !== workoutId));

      if (editingWorkoutId === workoutId) {
        resetWorkoutForm();
      }

      setMessage("Treino deletado com sucesso!");
    } catch (error) {
      setMessage(error?.message || "Erro ao deletar treino. Tente novamente.");
    }
  };

  const handleCloneWorkout = (workout) => {
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

  const handleUseTemplate = (template) => {
    setWorkoutForm({
      title: template.title,
      objective: template.objective,
      phase: "Hipertrofia", // Default phase
    });
    const templatesExercises = Array.isArray(template.items)
      ? template.items
      : [];
    const exercisesWithIds = templatesExercises.map((ex) => ({
      ...ex,
      id: Math.random().toString(36).substr(2, 9),
    }));
    setCurrentWorkoutExercises(exercisesWithIds);
    setSaveAsTemplate(false);
    // Scroll para o topo do formulário
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEditTemplate = (template) => {
    setWorkoutForm({
      title: template.title,
      objective: template.objective,
      phase: "Hipertrofia",
    });
    const templatesExercises = Array.isArray(template.items)
      ? template.items
      : [];
    const exercisesWithIds = templatesExercises.map((ex) => ({
      ...ex,
      id: Math.random().toString(36).substr(2, 9),
    }));
    setCurrentWorkoutExercises(exercisesWithIds);
    setEditingTemplateId(template.id);
    setSaveAsTemplate(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm("Tem certeza que deseja deletar este template?")) {
      return;
    }

    try {
      await deleteWorkoutTemplate(templateId, tenantId);
      setWorkoutTemplates((prev) =>
        prev.filter((template) => template.id !== templateId),
      );
      setMessage("Template deletado com sucesso!");
    } catch (error) {
      setMessage(
        error?.message || "Erro ao deletar template. Tente novamente.",
      );
    }
  };

  const handleEditCustomExercise = (exercise) => {
    setEditingExerciseId(exercise.id);
    setCustomExerciseForm({
      name: exercise.name,
      muscleGroup: exercise.muscleGroup,
      equipment: exercise.equipment,
    });
  };

  const handleSaveCustomExercise = async () => {
    if (
      !customExerciseForm.name.trim() ||
      !customExerciseForm.equipment.trim()
    ) {
      setMessage("Nome e equipamento são obrigatórios");
      return;
    }

    try {
      const updated = await updateCustomExercise(
        editingExerciseId,
        {
          name: customExerciseForm.name.trim(),
          muscleGroup: customExerciseForm.muscleGroup,
          equipment: customExerciseForm.equipment.trim(),
        },
        tenantId,
      );
      setCustomExercises((prev) =>
        prev.map((ex) => (ex.id === editingExerciseId ? updated : ex)),
      );
      setEditingExerciseId("");
      setCustomExerciseForm({ name: "", muscleGroup: "", equipment: "" });
      setMessage("Exercício atualizado com sucesso!");
    } catch (error) {
      setMessage(
        error?.message || "Erro ao atualizar exercício. Tente novamente.",
      );
    }
  };

  const handleDeleteCustomExercise = async (exerciseId) => {
    if (!window.confirm("Tem certeza que deseja deletar este exercício?")) {
      return;
    }

    try {
      await deleteCustomExercise(exerciseId, tenantId);
      setCustomExercises((prev) => prev.filter((ex) => ex.id !== exerciseId));
      setMessage("Exercício deletado com sucesso!");
    } catch (error) {
      setMessage(
        error?.message || "Erro ao deletar exercício. Tente novamente.",
      );
    }
  };

  const cancelEditCustomExercise = () => {
    setEditingExerciseId("");
    setCustomExerciseForm({ name: "", muscleGroup: "", equipment: "" });
  };

  const editingWorkoutExercise = useMemo(
    () =>
      currentWorkoutExercises.find(
        (exercise) => exercise.id === editingWorkoutExerciseId,
      ) || null,
    [currentWorkoutExercises, editingWorkoutExerciseId],
  );

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
        const endsAt = createLocalOffsetISOString(
          session.date,
          session.endsAtTime,
        );
        const recurrenceUntil =
          session.recurrence !== "NONE" && session.recurrenceUntilDate
            ? createLocalOffsetISOString(
                session.recurrenceUntilDate,
                "23:59",
                "59",
              )
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
      setScheduleError(
        "Adicione pelo menos uma nova sessao para salvar a agenda.",
      );
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
      setScheduleError(
        "Preencha titulo, data e horarios validos para editar a sessao.",
      );
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
            sessionDraft.recurrence !== "NONE" &&
            sessionDraft.recurrenceUntilDate
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
      setMessage(
        `${t("WORKOUT_BUILDER_SESSION_UPDATED_THIAGOIAZZETTI", "Sessao atualizada com sucesso")}: "${sessionDraft.title}".`,
      );
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
      setMessage(
        `${t("WORKOUT_BUILDER_SESSION_DELETED_THIAGOIAZZETTI", "Sessao removida com sucesso")}: "${sessionDraft.title}".`,
      );
    } catch (error) {
      setScheduleError(error?.message || "Nao foi possivel excluir a sessao.");
    } finally {
      setDeletingSessionId("");
    }
  };

  return (
    <main className="space-y-6 pb-10">
      <article className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6">
        <h2 className="font-title text-2xl text-[#b5f03c]">
          {editingWorkoutId
            ? t("WORKOUT_BUILDER_EDIT_TITLE_THIAGOIAZZETTI", "Editar Treino")
            : t(
                "WORKOUT_BUILDER_CREATE_TITLE_THIAGOIAZZETTI",
                "Criar Novo Treino",
              )}
        </h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block text-sm text-white/70">
            {t("WORKOUT_BUILDER_ALUNO_LABEL_THIAGOIAZZETTI", "Aluno")}
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none transition focus:border-[#b5f03c]/50"
            >
              <option value="">
                {t(
                  "DIET_FORM_SELECT_STUDENT_THIAGOIAZZETTI",
                  "Selecione um aluno",
                )}
              </option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.fullName}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm">
            <p className="text-white/50">
              {t(
                "WORKOUT_BUILDER_LINKED_TO_THIAGOIAZZETTI",
                "Treino sera vinculado a",
              )}
            </p>
            <p className="mt-1 font-semibold text-[#b5f03c]">
              {selectedStudent?.fullName ||
                t(
                  "WORKOUT_BUILDER_NO_STUDENT_THIAGOIAZZETTI",
                  "Nenhum aluno selecionado",
                )}
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
              {t(
                "WORKOUT_BUILDER_TITLE_LABEL_THIAGOIAZZETTI",
                "Titulo do treino",
              )}
              <input
                type="text"
                value={workoutForm.title}
                onChange={(e) =>
                  setWorkoutForm((prev) => ({ ...prev, title: e.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none transition placeholder:text-white/30 focus:border-[#b5f03c]/50"
                placeholder={t(
                  "WORKOUT_BUILDER_TITLE_PLACEHOLDER_THIAGOIAZZETTI",
                  "Ex: Peito e Costas",
                )}
              />
            </label>

            <label className="block text-sm text-white/70">
              {t("WORKOUT_BUILDER_OBJECTIVE_LABEL_THIAGOIAZZETTI", "Objetivo")}
              <input
                type="text"
                value={workoutForm.objective}
                onChange={(e) =>
                  setWorkoutForm((prev) => ({
                    ...prev,
                    objective: e.target.value,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none transition placeholder:text-white/30 focus:border-[#b5f03c]/50"
                placeholder={t(
                  "WORKOUT_BUILDER_OBJECTIVE_PLACEHOLDER_THIAGOIAZZETTI",
                  "Ex: Força e Hipertrofia",
                )}
              />
            </label>

            <label className="block text-sm text-white/70">
              {t(
                "WORKOUT_BUILDER_PHASE_LABEL_THIAGOIAZZETTI",
                "Fase de Treino",
              )}
              <select
                value={workoutForm.phase}
                onChange={(e) =>
                  setWorkoutForm((prev) => ({ ...prev, phase: e.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none transition focus:border-[#b5f03c]/50"
              >
                <option value="Hipertrofia">
                  {t(
                    "WORKOUT_BUILDER_PHASE_HYPERTROPHY_THIAGOIAZZETTI",
                    "Hipertrofia",
                  )}
                </option>
                <option value="Força">
                  {t("WORKOUT_BUILDER_PHASE_STRENGTH_THIAGOIAZZETTI", "Força")}
                </option>
                <option value="Definição">
                  {t(
                    "WORKOUT_BUILDER_PHASE_CUTTING_THIAGOIAZZETTI",
                    "Definição",
                  )}
                </option>
                <option value="Resistência">
                  {t(
                    "WORKOUT_BUILDER_PHASE_ENDURANCE_THIAGOIAZZETTI",
                    "Resistência",
                  )}
                </option>
              </select>
            </label>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-white/70">
              {t(
                "WORKOUT_BUILDER_EXERCISES_HEADER_THIAGOIAZZETTI",
                "Exercicios",
              )}{" "}
              ({currentWorkoutExercises.length})
            </p>
            <div className="space-y-2">
              {currentWorkoutExercises.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-8 text-center">
                  <AlertCircle
                    className="mx-auto mb-3 text-white/40"
                    size={24}
                  />
                  <p className="text-sm text-white/60">
                    {t(
                      "WORKOUT_BUILDER_CLICK_TO_ADD_THIAGOIAZZETTI",
                      "Clique em Adicionar exercicio para comecar",
                    )}
                  </p>
                </div>
              ) : (
                currentWorkoutExercises.map((exercise) => (
                  <WorkoutItem
                    key={exercise.id}
                    exercise={exercise}
                    onEdit={handleEditExercise}
                    onRemove={handleRemoveExercise}
                  />
                ))
              )}
            </div>
          </div>

          <label className="inline-flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70 transition hover:border-white/20">
            <input
              type="checkbox"
              checked={saveAsTemplate}
              onChange={(e) => setSaveAsTemplate(e.target.checked)}
              className="h-4 w-4 rounded border border-white/30 bg-white/5"
            />
            {t(
              "WORKOUT_BUILDER_SAVE_AS_TEMPLATE_THIAGOIAZZETTI",
              "Salvar como template",
            )}
          </label>

          <div className="flex flex-wrap gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setEditingWorkoutExerciseId("");
                setShowExerciseModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-[#b5f03c]/50 bg-[#b5f03c]/10 px-6 py-3 font-semibold text-[#b5f03c] transition hover:bg-[#b5f03c]/20"
            >
              <Plus size={16} />
              {t(
                "WORKOUT_BUILDER_ADD_EXERCISE_BTN_THIAGOIAZZETTI",
                "Adicionar Exercicio",
              )}
            </button>

            <button
              type="submit"
              disabled={saving || (!selectedStudentId && !editingTemplateId)}
              className="flex-1 rounded-xl bg-[#b5f03c] px-6 py-3 font-semibold text-black transition hover:brightness-110 md:flex-none"
            >
              {saving
                ? t("DIET_FORM_SAVING_THIAGOIAZZETTI", "Salvando...")
                : editingTemplateId
                  ? t(
                      "WORKOUT_BUILDER_UPDATE_TEMPLATE_BTN_THIAGOIAZZETTI",
                      "Atualizar Template",
                    )
                  : editingWorkoutId
                    ? t(
                        "WORKOUT_BUILDER_UPDATE_BTN_THIAGOIAZZETTI",
                        "Atualizar Treino",
                      )
                    : t(
                        "WORKOUT_BUILDER_SAVE_BTN_THIAGOIAZZETTI",
                        "Salvar Treino",
                      )}
            </button>

            {editingWorkoutId || editingTemplateId ? (
              <button
                type="button"
                onClick={resetWorkoutForm}
                className="rounded-xl border border-white/10 px-6 py-3 font-semibold text-white/70 transition hover:border-white/20"
              >
                {t(
                  "WORKOUT_BUILDER_CANCEL_EDIT_THIAGOIAZZETTI",
                  "Cancelar edicao",
                )}
              </button>
            ) : null}
          </div>
        </form>
      </article>
      <article className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-title text-2xl text-[#b5f03c]">
            {t(
              "WORKOUT_BUILDER_CUSTOM_EXERCISES_TITLE_THIAGOIAZZETTI",
              "Exercicios Customizados",
            )}{" "}
            ({customExercises.length})
          </h2>
          <button
            type="button"
            onClick={() => setShowCustomExercises(!showCustomExercises)}
            className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/70 transition hover:border-white/20"
          >
            {showCustomExercises ? "Ocultar" : "Mostrar"}
          </button>
        </div>

        {showCustomExercises && (
          <div className="mt-5 space-y-3">
            {customExercises.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-black/30 px-6 py-8 text-center">
                <Dumbbell className="mx-auto mb-3 text-white/40" size={32} />
                <p className="text-white/60">
                  {t(
                    "WORKOUT_BUILDER_NO_CUSTOM_EXERCISES_THIAGOIAZZETTI",
                    "Nenhum exercicio customizado criado ainda.",
                  )}
                </p>
              </div>
            ) : (
              <>
                {editingExerciseId ? (
                  <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <h3 className="mb-4 font-semibold text-[#b5f03c]">
                      Editando exercício
                    </h3>
                    <div className="space-y-3">
                      <label className="block text-sm text-white/70">
                        Nome
                        <input
                          type="text"
                          value={customExerciseForm.name}
                          onChange={(e) =>
                            setCustomExerciseForm((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                          className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none transition focus:border-[#b5f03c]/50"
                        />
                      </label>
                      <label className="block text-sm text-white/70">
                        Grupo Muscular
                        <select
                          value={customExerciseForm.muscleGroup}
                          onChange={(e) =>
                            setCustomExerciseForm((prev) => ({
                              ...prev,
                              muscleGroup: e.target.value,
                            }))
                          }
                          className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none transition focus:border-[#b5f03c]/50"
                        >
                          <option value="">Selecionar</option>
                          {Object.keys(exerciseLibrary).map((group) => (
                            <option key={group} value={group}>
                              {group}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-sm text-white/70">
                        Equipamento
                        <input
                          type="text"
                          value={customExerciseForm.equipment}
                          onChange={(e) =>
                            setCustomExerciseForm((prev) => ({
                              ...prev,
                              equipment: e.target.value,
                            }))
                          }
                          className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none transition focus:border-[#b5f03c]/50"
                        />
                      </label>
                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={handleSaveCustomExercise}
                          className="flex-1 rounded-xl bg-[#b5f03c] px-4 py-2 font-semibold text-black transition hover:brightness-110"
                        >
                          Salvar
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditCustomExercise}
                          className="flex-1 rounded-xl border border-white/10 px-4 py-2 font-semibold text-white/70 transition hover:border-white/20"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
                {customExercises.map((exercise) => (
                  <div
                    key={exercise.id}
                    className="rounded-2xl border border-white/10 bg-black/30 p-4"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-white">
                          {exercise.name}
                        </p>
                        <p className="text-sm text-white/55">
                          {exercise.muscleGroup}
                        </p>
                        <p className="text-xs text-white/40">
                          {exercise.equipment}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditCustomExercise(exercise)}
                          className="rounded-lg border border-white/10 p-2 text-white/60 transition hover:text-[#b5f03c]"
                          title="Editar exercício"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteCustomExercise(exercise.id)
                          }
                          className="rounded-lg border border-white/10 p-2 text-white/60 transition hover:text-red-400"
                          title="Deletar exercício"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </article>

      <article className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6">
        <h2 className="font-title text-2xl text-[#b5f03c]">
          {t(
            "WORKOUT_BUILDER_TEMPLATES_TITLE_THIAGOIAZZETTI",
            "Templates de Treino",
          )}
        </h2>
        <p className="mt-2 text-sm text-white/60">
          {t(
            "WORKOUT_BUILDER_TEMPLATES_SUBTITLE_THIAGOIAZZETTI",
            "Use templates pre-definidos como base e customize conforme necessario",
          )}
        </p>

        <div className="mt-5 space-y-3">
          {trainingTemplates.map((template) => (
            <div
              key={template.name}
              className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-semibold text-white">{template.name}</p>
                <p className="text-sm text-white/55">{template.description}</p>
                <p className="mt-1 text-xs text-white/40">
                  {template.exercises.length}{" "}
                  {t(
                    "WORKOUT_BUILDER_EXERCISES_COUNT_THIAGOIAZZETTI",
                    "exercicios",
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleApplyTemplate(template)}
                className="rounded-lg border border-[#b5f03c]/50 bg-[#b5f03c]/10 px-4 py-2 text-sm font-medium text-[#b5f03c] transition hover:bg-[#b5f03c]/20"
              >
                {t(
                  "WORKOUT_BUILDER_USE_TEMPLATE_THIAGOIAZZETTI",
                  "Usar Template",
                )}
              </button>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6">
        <h2 className="font-title text-2xl text-[#b5f03c]">
          {t(
            "WORKOUT_BUILDER_STUDENT_WORKOUTS_TITLE_THIAGOIAZZETTI",
            "Treinos do Aluno",
          )}{" "}
          ({workouts.length})
        </h2>

        <div className="mt-5 space-y-3">
          {workouts.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/30 px-6 py-8 text-center">
              <Dumbbell className="mx-auto mb-3 text-white/40" size={32} />
              <p className="text-white/60">
                {t(
                  "WORKOUT_BUILDER_NO_WORKOUTS_THIAGOIAZZETTI",
                  "Nenhum treino criado ainda. Crie seu primeiro treino acima!",
                )}
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
                      {workout.exercises.length}{" "}
                      {t(
                        "WORKOUT_BUILDER_EXERCISES_COUNT_THIAGOIAZZETTI",
                        "exercicios",
                      )}{" "}
                      •{" "}
                      {t("WORKOUT_BUILDER_PHASE_BADGE_THIAGOIAZZETTI", "Fase")}:{" "}
                      {workout.phase}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditWorkout(workout)}
                      className="rounded-lg border border-white/10 p-2 text-white/60 transition hover:text-[#b5f03c]"
                      title="Editar treino"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => openScheduleModal(workout)}
                      className="rounded-lg border border-white/10 p-2 text-white/60 transition hover:text-[#b5f03c]"
                      title="Agendar treinos"
                    >
                      <CalendarDays size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCloneWorkout(workout)}
                      className="rounded-lg border border-white/10 p-2 text-white/60 transition hover:text-[#b5f03c]"
                      title="Clonar treino"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteWorkout(workout.id)}
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
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#b5f03c]">
                    <Clock3 size={16} />
                    {t(
                      "CLIENT_WORKOUTS_UPCOMING_TITLE_THIAGOIAZZETTI",
                      "Proximas sessoes",
                    )}
                  </div>

                  <div className="mt-3 space-y-2">
                    {workout.schedule.length === 0 ? (
                      <p className="text-sm text-white/55">
                        Nenhuma sessao agendada ainda. Clique no calendario para
                        montar a agenda deste plano.
                      </p>
                    ) : (
                      workout.schedule
                        .slice()
                        .sort(
                          (left, right) =>
                            new Date(left.startsAt) - new Date(right.startsAt),
                        )
                        .slice(0, 5)
                        .map((session) => (
                          <div
                            key={
                              session.id || `${workout.id}-${session.startsAt}`
                            }
                            className="rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white/70"
                          >
                            <p className="font-semibold text-white">
                              {session.title}
                            </p>
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

      <article className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6">
        <h2 className="font-title text-2xl text-[#b5f03c]">
          {t(
            "WORKOUT_BUILDER_TEMPLATES_TITLE_THIAGOIAZZETTI",
            "Templates de Treino",
          )}{" "}
          ({workoutTemplates.length})
        </h2>

        <div className="mt-5 space-y-3">
          {workoutTemplates.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/30 px-6 py-8 text-center">
              <Bookmark className="mx-auto mb-3 text-white/40" size={32} />
              <p className="text-white/60">
                {t(
                  "WORKOUT_BUILDER_NO_TEMPLATES_THIAGOIAZZETTI",
                  "Nenhum template criado ainda. Marque a opcao 'Salvar como template' ao criar um treino!",
                )}
              </p>
            </div>
          ) : (
            workoutTemplates.map((template) => (
              <div
                key={template.id}
                className="rounded-2xl border border-white/10 bg-black/30 p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-white">{template.title}</p>
                    <p className="mt-1 text-sm text-white/55">
                      {template.objective}
                    </p>
                    {template.items && (
                      <p className="mt-1 text-xs text-white/40">
                        {template.items.length}{" "}
                        {t(
                          "WORKOUT_BUILDER_EXERCISES_COUNT_THIAGOIAZZETTI",
                          "exercicios",
                        )}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleUseTemplate(template)}
                      className="rounded-lg border border-[#b5f03c]/50 bg-[#b5f03c]/10 p-2 text-[#b5f03c] transition hover:bg-[#b5f03c]/20"
                      title="Usar template"
                    >
                      <Play size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditTemplate(template)}
                      className="rounded-lg border border-white/10 p-2 text-white/60 transition hover:text-[#b5f03c]"
                      title="Editar template"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="rounded-lg border border-white/10 p-2 text-white/60 transition hover:text-red-400"
                      title="Deletar template"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {template.items && template.items.length > 0 && (
                  <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                    {template.items.map((exercise, index) => (
                      <div key={index} className="text-sm text-white/70">
                        <span className="font-semibold text-white">
                          {exercise.exerciseName}
                        </span>{" "}
                        • {exercise.sets}x{exercise.reps}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </article>

      {showExerciseModal && (
        <ExerciseSelector
          exerciseLibrary={mergedExerciseLibrary}
          tenantId={tenantId}
          onAdd={handleAddExerciseToWorkout}
          initialExercise={editingWorkoutExercise}
          isEditing={Boolean(editingWorkoutExercise)}
          onClose={() => {
            setShowExerciseModal(false);
            setEditingWorkoutExerciseId("");
          }}
          onExerciseCreated={(exercise) => {
            // Adicionar o novo exercício ao estado de customExercises
            setCustomExercises((prev) => [...prev, exercise]);
          }}
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
    </main>
  );
}
