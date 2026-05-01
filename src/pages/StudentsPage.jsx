import React from "react";
import { useI18n } from "../contexts/I18nContext.jsx";

const students = [
  { id: "1", nome: "Lucas M.", foco: "Hipertrofia", progresso: "Excelente" },
  { id: "2", nome: "Bruna F.", foco: "Emagrecimento", progresso: "Constante" },
  {
    id: "3",
    nome: "Rafael P.",
    foco: "Performance",
    progresso: "Ajustar carga",
  },
];

export default function StudentsPage() {
  const { t } = useI18n();
  return (
    <section className="rounded-premium border border-black/10 bg-white p-5 shadow-soft">
      <h1 className="font-title text-3xl text-premium-gold">
        {t("STUDENTS_TITLE_THIAGOIAZZETTI", "Meus Alunos")}
      </h1>
      <p className="mt-1 font-body text-sm text-premium-anthracite/70">
        {t(
          "STUDENTS_SUBTITLE_THIAGOIAZZETTI",
          "Visao consolidada de objetivos e progresso.",
        )}
      </p>

      <div className="mt-5 grid gap-3">
        {students.map((student) => (
          <article
            key={student.id}
            className="rounded-premium border border-black/10 p-4"
          >
            <p className="font-body font-semibold text-premium-anthracite">
              {student.nome}
            </p>
            <p className="font-body text-sm text-premium-anthracite/70">
              {t("STUDENTS_FOCUS_LABEL_THIAGOIAZZETTI", "Foco")}: {student.foco}
            </p>
            <p className="font-body text-sm text-premium-anthracite/70">
              {t("STUDENTS_PROGRESS_LABEL_THIAGOIAZZETTI", "Progresso")}:{" "}
              {student.progresso}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
