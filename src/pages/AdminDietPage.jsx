import React, { useEffect, useMemo, useState } from "react";
import { Download, Save, Salad, Trash2 } from "lucide-react";
import { jsPDF } from "jspdf";
import {
  createDiet,
  deleteDiet,
  listDiets,
  listStudents,
  updateDiet,
} from "../lib/api.js";
import { useTenant } from "../contexts/TenantContext.jsx";
import { useI18n } from "../contexts/I18nContext.jsx";

const WEEKDAY_VALUES = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

function weekdayLabelStatic(value) {
  const map = {
    MONDAY: "Segunda",
    TUESDAY: "Terca",
    WEDNESDAY: "Quarta",
    THURSDAY: "Quinta",
    FRIDAY: "Sexta",
    SATURDAY: "Sabado",
    SUNDAY: "Domingo",
  };
  return map[value] || value;
}

export default function AdminDietPage() {
  const { tenantId } = useTenant();
  const { t } = useI18n();

  const WEEKDAYS = [
    { value: "MONDAY", label: t("DIET_WEEKDAY_MON_THIAGOIAZZETTI", "Segunda") },
    { value: "TUESDAY", label: t("DIET_WEEKDAY_TUE_THIAGOIAZZETTI", "Terca") },
    {
      value: "WEDNESDAY",
      label: t("DIET_WEEKDAY_WED_THIAGOIAZZETTI", "Quarta"),
    },
    {
      value: "THURSDAY",
      label: t("DIET_WEEKDAY_THU_THIAGOIAZZETTI", "Quinta"),
    },
    { value: "FRIDAY", label: t("DIET_WEEKDAY_FRI_THIAGOIAZZETTI", "Sexta") },
    {
      value: "SATURDAY",
      label: t("DIET_WEEKDAY_SAT_THIAGOIAZZETTI", "Sabado"),
    },
    { value: "SUNDAY", label: t("DIET_WEEKDAY_SUN_THIAGOIAZZETTI", "Domingo") },
  ];

  const weekdayLabel = (value) =>
    WEEKDAYS.find((item) => item.value === value)?.label ||
    weekdayLabelStatic(value);
  const [students, setStudents] = useState([]);
  const [diets, setDiets] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState({
    alunoId: "",
    title: "",
    description: "",
    weekdays: [],
    mealPlan: "",
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const [studentsData, dietsData] = await Promise.all([
          listStudents(tenantId),
          listDiets(tenantId),
        ]);

        if (cancelled) return;

        const normalizedStudents = Array.isArray(studentsData)
          ? studentsData
          : [];
        setStudents(normalizedStudents);
        setDiets(Array.isArray(dietsData) ? dietsData : []);
        setForm((prev) => ({
          ...prev,
          alunoId: prev.alunoId || normalizedStudents[0]?.id || "",
        }));
      } catch (error) {
        if (!cancelled) {
          setMessage(
            error?.message ||
              t(
                "DIET_LOAD_ERROR_THIAGOIAZZETTI",
                "Nao foi possivel carregar dietas",
              ),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (tenantId) load();

    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === form.alunoId) || null,
    [students, form.alunoId],
  );

  const selectedWeekdays = useMemo(
    () => new Set(form.weekdays),
    [form.weekdays],
  );

  const resetForm = () => {
    setEditingId("");
    setForm({
      alunoId: students[0]?.id || "",
      title: "",
      description: "",
      weekdays: [],
      mealPlan: "",
    });
  };

  const toggleWeekday = (weekday) => {
    setForm((prev) => {
      const set = new Set(prev.weekdays);
      if (set.has(weekday)) {
        set.delete(weekday);
      } else {
        set.add(weekday);
      }
      return { ...prev, weekdays: Array.from(set) };
    });
  };

  const buildPayload = () => ({
    alunoId: form.alunoId,
    title: form.title,
    description: form.description || null,
    days: form.weekdays.map((weekday) => ({
      weekday,
      mealPlan: form.mealPlan,
    })),
  });

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.alunoId || !form.title.trim() || !form.mealPlan.trim()) {
      setMessage(
        t(
          "DIET_REQUIRED_FIELDS_THIAGOIAZZETTI",
          "Aluno, titulo e cardapio sao obrigatorios",
        ),
      );
      return;
    }

    if (form.weekdays.length === 0) {
      setMessage(
        t(
          "DIET_SELECT_WEEKDAY_THIAGOIAZZETTI",
          "Selecione pelo menos um dia da semana",
        ),
      );
      return;
    }

    try {
      setSaving(true);
      const payload = buildPayload();
      const saved = editingId
        ? await updateDiet(editingId, payload, tenantId)
        : await createDiet(payload, tenantId);

      setDiets((prev) => {
        if (editingId) {
          return prev.map((item) => (item.id === editingId ? saved : item));
        }
        return [saved, ...prev];
      });
      setMessage(
        editingId
          ? t("DIET_UPDATED_THIAGOIAZZETTI", "Dieta atualizada")
          : t("DIET_CREATED_THIAGOIAZZETTI", "Dieta criada"),
      );
      resetForm();
    } catch (error) {
      setMessage(
        error?.message ||
          t("DIET_SAVE_ERROR_THIAGOIAZZETTI", "Nao foi possivel salvar dieta"),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (diet) => {
    setEditingId(diet.id);
    setForm({
      alunoId: diet.alunoId,
      title: diet.title || "",
      description: diet.description || "",
      weekdays: Array.isArray(diet.days)
        ? diet.days.map((day) => day.weekday)
        : [],
      mealPlan: diet.days?.[0]?.mealPlan || "",
    });
  };

  const handleDelete = async (dietId) => {
    try {
      await deleteDiet(dietId, tenantId);
      setDiets((prev) => prev.filter((item) => item.id !== dietId));
      if (editingId === dietId) {
        resetForm();
      }
      setMessage(t("DIET_DELETED_THIAGOIAZZETTI", "Dieta removida"));
    } catch (error) {
      setMessage(
        error?.message ||
          t(
            "DIET_DELETE_ERROR_THIAGOIAZZETTI",
            "Nao foi possivel remover dieta",
          ),
      );
    }
  };

  const exportDietPdf = (diet) => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const marginX = 44;
    let y = 50;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Plano de Dieta", marginX, y);

    y += 24;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(`Aluno: ${diet?.aluno?.fullName || "Aluno"}`, marginX, y);
    y += 18;
    doc.text(`Titulo: ${diet.title}`, marginX, y);

    if (diet.description) {
      y += 18;
      const split = doc.splitTextToSize(`Descricao: ${diet.description}`, 500);
      doc.text(split, marginX, y);
      y += split.length * 14;
    }

    y += 10;
    doc.setFont("helvetica", "bold");
    doc.text("Dias da semana", marginX, y);

    y += 16;
    doc.setFont("helvetica", "normal");
    (diet.days || []).forEach((day) => {
      if (y > 760) {
        doc.addPage();
        y = 50;
      }

      doc.setFont("helvetica", "bold");
      doc.text(weekdayLabel(day.weekday), marginX, y);
      y += 14;
      doc.setFont("helvetica", "normal");
      const textLines = doc.splitTextToSize(day.mealPlan || "-", 500);
      doc.text(textLines, marginX + 10, y);
      y += textLines.length * 13 + 8;
    });

    const safeTitle = String(diet.title || "dieta")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    doc.save(`${safeTitle || "dieta"}.pdf`);
  };

  return (
    <main className="space-y-6">
      <header className="rounded-4xl border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(115,180,100,0.25),rgba(10,10,10,0.9)_45%),linear-gradient(180deg,#0f0f0f,#080808)] p-6">
        <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1 text-xs uppercase tracking-[0.18em] text-white/65">
          <Salad size={12} />
          {t("DIET_HEADER_BADGE_THIAGOIAZZETTI", "Dietas Semanais")}
        </p>
        <h1 className="mt-4 font-title text-4xl text-[#b5f03c]">
          {t(
            "DIET_HEADER_TITLE_THIAGOIAZZETTI",
            "Cadastro de dietas por dia da semana",
          )}
        </h1>
        <p className="mt-3 max-w-3xl text-white/65">
          {t(
            "DIET_HEADER_SUBTITLE_THIAGOIAZZETTI",
            "Crie um plano de dieta, vincule a um aluno e selecione um ou varios dias da semana. Cada plano fica isolado.",
          )}
        </p>
      </header>

      {message ? (
        <p className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/80">
          {message}
        </p>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1.1fr_1.2fr]">
        <article className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-6">
          <h2 className="font-title text-2xl text-[#b5f03c]">
            {editingId
              ? t("DIET_FORM_EDIT_TITLE_THIAGOIAZZETTI", "Editar dieta")
              : t("DIET_FORM_NEW_TITLE_THIAGOIAZZETTI", "Nova dieta")}
          </h2>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <label className="block text-sm text-white/70">
              {t("DIET_FORM_STUDENT_LABEL_THIAGOIAZZETTI", "Aluno")}
              <select
                value={form.alunoId}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, alunoId: e.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none"
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

            <label className="block text-sm text-white/70">
              {t("DIET_FORM_TITLE_LABEL_THIAGOIAZZETTI", "Titulo")}
              <input
                value={form.title}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder={t(
                  "DIET_FORM_TITLE_PLACEHOLDER_THIAGOIAZZETTI",
                  "Ex: Dieta de definicao",
                )}
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none"
              />
            </label>

            <label className="block text-sm text-white/70">
              {t("DIET_FORM_DESC_LABEL_THIAGOIAZZETTI", "Descricao (opcional)")}
              <input
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder={t(
                  "DIET_FORM_DESC_PLACEHOLDER_THIAGOIAZZETTI",
                  "Objetivo da dieta",
                )}
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none"
              />
            </label>

            <fieldset>
              <legend className="text-sm text-white/70">
                {t(
                  "DIET_FORM_WEEKDAYS_LEGEND_THIAGOIAZZETTI",
                  "Dias da semana",
                )}
              </legend>
              <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
                {WEEKDAYS.map((weekday) => {
                  const active = selectedWeekdays.has(weekday.value);
                  return (
                    <button
                      key={weekday.value}
                      type="button"
                      onClick={() => toggleWeekday(weekday.value)}
                      className={`rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] transition ${active ? "border-[#b5f03c]/50 bg-[#b5f03c]/20 text-[#d4f7a0]" : "border-white/15 bg-white/5 text-white/60"}`}
                    >
                      {weekday.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <label className="block text-sm text-white/70">
              {t(
                "DIET_FORM_MEALPLAN_LABEL_THIAGOIAZZETTI",
                "Cardapio para os dias selecionados",
              )}
              <textarea
                rows={8}
                value={form.mealPlan}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, mealPlan: e.target.value }))
                }
                placeholder={t(
                  "DIET_FORM_MEALPLAN_PLACEHOLDER_THIAGOIAZZETTI",
                  "Ex: Cafe da manha: ovos e aveia...",
                )}
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-[#b5f03c] px-5 py-2.5 font-semibold text-black disabled:opacity-60"
              >
                <Save size={16} />
                {saving
                  ? t("DIET_FORM_SAVING_THIAGOIAZZETTI", "Salvando...")
                  : editingId
                    ? t(
                        "DIET_FORM_SAVE_CHANGES_THIAGOIAZZETTI",
                        "Salvar alteracoes",
                      )
                    : t("DIET_FORM_CREATE_THIAGOIAZZETTI", "Criar dieta")}
              </button>

              {editingId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-white/15 px-5 py-2.5 text-sm text-white/70"
                >
                  {t("DIET_FORM_CANCEL_THIAGOIAZZETTI", "Cancelar")}
                </button>
              ) : null}
            </div>

            {selectedStudent ? (
              <p className="text-xs text-white/50">
                {t(
                  "DIET_FORM_ASSOC_STUDENT_THIAGOIAZZETTI",
                  "Plano sera associado ao aluno",
                )}
                : {selectedStudent.fullName}
              </p>
            ) : null}
          </form>
        </article>

        <article className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-6">
          <h2 className="font-title text-2xl text-[#b5f03c]">
            {t("DIET_LIST_TITLE_THIAGOIAZZETTI", "Dietas cadastradas")} (
            {diets.length})
          </h2>

          <div className="mt-4 space-y-3">
            {loading ? (
              <p className="text-sm text-white/60">
                {t("DIET_LIST_LOADING_THIAGOIAZZETTI", "Carregando...")}
              </p>
            ) : diets.length === 0 ? (
              <p className="rounded-xl border border-white/10 bg-black/25 px-4 py-4 text-sm text-white/60">
                {t(
                  "DIET_LIST_EMPTY_THIAGOIAZZETTI",
                  "Nenhuma dieta cadastrada ainda.",
                )}
              </p>
            ) : (
              diets.map((diet) => (
                <div
                  key={diet.id}
                  className="rounded-2xl border border-white/10 bg-black/30 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{diet.title}</p>
                      <p className="text-sm text-white/60">
                        {t("DIET_LIST_STUDENT_LABEL_THIAGOIAZZETTI", "Aluno")}:{" "}
                        {diet?.aluno?.fullName ||
                          t(
                            "DIET_LIST_STUDENT_DEFAULT_THIAGOIAZZETTI",
                            "Aluno",
                          )}
                      </p>
                      {diet.description ? (
                        <p className="mt-1 text-sm text-white/55">
                          {diet.description}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => exportDietPdf(diet)}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/35 px-3 py-1 text-xs text-emerald-200"
                      >
                        <Download size={13} /> PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEdit(diet)}
                        className="rounded-lg border border-white/20 px-3 py-1 text-xs text-white/80"
                      >
                        {t("DIET_LIST_EDIT_BUTTON_THIAGOIAZZETTI", "Editar")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(diet.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-400/35 px-3 py-1 text-xs text-red-200"
                      >
                        <Trash2 size={13} />{" "}
                        {t("DIET_LIST_DELETE_BUTTON_THIAGOIAZZETTI", "Excluir")}
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {(diet.days || []).map((day) => (
                      <span
                        key={`${diet.id}-${day.weekday}`}
                        className="rounded-full border border-[#b5f03c]/45 bg-[#b5f03c]/12 px-3 py-1 text-xs text-[#d4f7a0]"
                      >
                        {weekdayLabel(day.weekday)}
                      </span>
                    ))}
                  </div>

                  {(diet.days || []).slice(0, 1).map((day) => (
                    <p
                      key={day.id || day.weekday}
                      className="mt-3 whitespace-pre-wrap text-sm text-white/70"
                    >
                      {day.mealPlan}
                    </p>
                  ))}
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
