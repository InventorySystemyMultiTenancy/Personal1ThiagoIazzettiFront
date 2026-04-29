import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

const exerciseCatalog = [
  "Agachamento",
  "Supino Reto",
  "Remada Curvada",
  "Levantamento Terra",
  "Desenvolvimento",
];

export default function WorkoutBuilderPage() {
  const [items, setItems] = useState([
    {
      id: crypto.randomUUID(),
      exercicio: "Agachamento",
      series: "4",
      repeticoes: "10",
      carga: "60kg",
      descanso: "90s",
    },
  ]);

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        exercicio: exerciseCatalog[0],
        series: "3",
        repeticoes: "12",
        carga: "",
        descanso: "60s",
      },
    ]);
  };

  const updateItem = (id, field, value) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const removeItem = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <section className="rounded-premium border border-black/10 bg-white p-5 shadow-soft">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-title text-3xl text-premium-gold">
            Workout Builder
          </h1>
          <p className="font-body text-sm text-premium-anthracite/70">
            Monte o treino com selecao rapida de exercicios e parametros.
          </p>
        </div>
        <button
          type="button"
          onClick={addItem}
          className="inline-flex items-center gap-2 rounded-premium bg-premium-gold px-4 py-2 font-body text-sm font-semibold text-premium-ink shadow-gold"
        >
          <Plus size={16} />
          Adicionar Exercicio
        </button>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <article
            key={item.id}
            className="grid grid-cols-1 gap-3 rounded-premium border border-black/10 p-4 md:grid-cols-6"
          >
            <label className="font-body text-xs text-premium-anthracite/70">
              Exercicio
              <select
                className="mt-1 w-full rounded-premium border border-black/15 px-2 py-2 font-body text-sm"
                value={item.exercicio}
                onChange={(e) =>
                  updateItem(item.id, "exercicio", e.target.value)
                }
              >
                {exerciseCatalog.map((exercise) => (
                  <option key={exercise} value={exercise}>
                    {exercise}
                  </option>
                ))}
              </select>
            </label>

            <label className="font-body text-xs text-premium-anthracite/70">
              Series
              <input
                className="mt-1 w-full rounded-premium border border-black/15 px-2 py-2 font-body text-sm"
                value={item.series}
                onChange={(e) => updateItem(item.id, "series", e.target.value)}
              />
            </label>

            <label className="font-body text-xs text-premium-anthracite/70">
              Repeticoes
              <input
                className="mt-1 w-full rounded-premium border border-black/15 px-2 py-2 font-body text-sm"
                value={item.repeticoes}
                onChange={(e) =>
                  updateItem(item.id, "repeticoes", e.target.value)
                }
              />
            </label>

            <label className="font-body text-xs text-premium-anthracite/70">
              Carga
              <input
                className="mt-1 w-full rounded-premium border border-black/15 px-2 py-2 font-body text-sm"
                value={item.carga}
                onChange={(e) => updateItem(item.id, "carga", e.target.value)}
              />
            </label>

            <label className="font-body text-xs text-premium-anthracite/70">
              Descanso
              <input
                className="mt-1 w-full rounded-premium border border-black/15 px-2 py-2 font-body text-sm"
                value={item.descanso}
                onChange={(e) =>
                  updateItem(item.id, "descanso", e.target.value)
                }
              />
            </label>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-premium border border-red-300 px-3 py-2 font-body text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 size={16} />
                Remover
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
