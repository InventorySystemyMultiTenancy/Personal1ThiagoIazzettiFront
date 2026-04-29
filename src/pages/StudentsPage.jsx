import React from "react";

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
  return (
    <section className="rounded-premium border border-black/10 bg-white p-5 shadow-soft">
      <h1 className="font-title text-3xl text-premium-gold">Meus Alunos</h1>
      <p className="mt-1 font-body text-sm text-premium-anthracite/70">
        Visao consolidada de objetivos e progresso.
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
              Foco: {student.foco}
            </p>
            <p className="font-body text-sm text-premium-anthracite/70">
              Progresso: {student.progresso}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
