import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  Copy,
  Dumbbell,
  X,
  AlertCircle,
} from "lucide-react";
import {
  createWorkoutPlan,
  listStudents,
  listWorkoutPlans,
} from "../lib/api.js";
import { useTenant } from "../contexts/TenantContext.jsx";

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

function WorkoutItem({ exercise, onRemove }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
      <div className="flex-1">
        <p className="font-semibold text-white">{exercise.exerciseName}</p>
        <p className="text-sm text-white/60">
          {exercise.sets}x{exercise.reps} • Descanso:{" "}
          {exercise.restSeconds ? `${exercise.restSeconds}s` : "livre"}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded-lg border border-white/10 p-2 text-white/60 transition hover:text-[#d9b341]"
        >
          <Edit2 size={16} />
        </button>
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
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [workouts, setWorkouts] = useState([]);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [currentWorkoutExercises, setCurrentWorkoutExercises] = useState([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [workoutForm, setWorkoutForm] = useState({
    title: "",
    objective: "",
    phase: "Hipertrofia",
  });

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId) || null,
    [students, selectedStudentId],
  );

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
          const normalized = plans.map((plan) => ({
            ...plan,
            exercises: Array.isArray(plan.items) ? plan.items : [],
          }));
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

  const handleApplyTemplate = (template) => {
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
      setMessage("Selecione um aluno para vincular o treino");
      return;
    }

    if (!workoutForm.title.trim() || currentWorkoutExercises.length === 0) {
      setMessage("Preencha o titulo e adicione exercicios");
      return;
    }

    setSaving(true);
    try {
      const created = await createWorkoutPlan(
        {
          alunoId: selectedStudentId,
          title: workoutForm.title,
          objective:
            `${workoutForm.objective || ""} [Fase: ${workoutForm.phase}]`.trim(),
          items: currentWorkoutExercises.map((exercise, index) => ({
            exerciseName: exercise.exerciseName,
            sets: Number(exercise.sets),
            reps: String(exercise.reps),
            restSeconds: exercise.restSeconds
              ? Number(exercise.restSeconds)
              : null,
            orderIndex: index,
          })),
        },
        tenantId,
      );

      const normalized = {
        ...created,
        exercises: Array.isArray(created?.items) ? created.items : [],
      };

      setWorkouts((prev) => [normalized, ...prev]);
      setWorkoutForm({ title: "", objective: "", phase: "Hipertrofia" });
      setCurrentWorkoutExercises([]);
      setMessage(
        `Treino "${created.title}" salvo para ${selectedStudent?.fullName || "aluno"}`,
      );
    } catch (error) {
      setMessage(error?.message || "Nao foi possivel salvar treino");
    } finally {
      setSaving(false);
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

  return (
    <main className="space-y-6 pb-10">
      <article className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6">
        <h2 className="font-title text-2xl text-[#d9c179]">
          Criar Novo Treino
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
                  />
                ))
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-4">
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
              {saving ? "Salvando..." : "Salvar Treino"}
            </button>
          </div>
        </form>
      </article>

      <article className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6">
        <h2 className="font-title text-2xl text-[#d9c179]">
          Templates de Treino
        </h2>
        <p className="mt-2 text-sm text-white/60">
          Use templates pré-definidos como base e customize conforme necessário
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
                  {template.exercises.length} exercícios
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleApplyTemplate(template)}
                className="rounded-lg border border-[#d9b341]/50 bg-[#d9b341]/10 px-4 py-2 text-sm font-medium text-[#d9c179] transition hover:bg-[#d9b341]/20"
              >
                Usar Template
              </button>
            </div>
          ))}
        </div>
      </article>

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
    </main>
  );
}
