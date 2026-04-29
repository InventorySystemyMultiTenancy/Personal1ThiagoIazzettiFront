import React, { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  Tooltip,
} from "recharts";
import { useTenant } from "../contexts/TenantContext.jsx";
import { tenantFetch } from "../lib/api.js";

const mockSummary = {
  totalAlunos: 48,
  treinosHoje: 19,
  faturamentoMes: 12450,
};

const mockProgress = [
  { week: "Sem 1", carga: 62 },
  { week: "Sem 2", carga: 68 },
  { week: "Sem 3", carga: 71 },
  { week: "Sem 4", carga: 77 },
  { week: "Sem 5", carga: 82 },
  { week: "Sem 6", carga: 86 },
];

const mockStudents = [
  {
    id: "1",
    nome: "Lucas M.",
    foto: "LM",
    planoStatus: "Ativo",
    inicio: "10/01/2026",
  },
  {
    id: "2",
    nome: "Bruna F.",
    foto: "BF",
    planoStatus: "Ativo",
    inicio: "22/02/2026",
  },
  {
    id: "3",
    nome: "Rafael P.",
    foto: "RP",
    planoStatus: "Pendente",
    inicio: "03/03/2026",
  },
  {
    id: "4",
    nome: "Carla N.",
    foto: "CN",
    planoStatus: "Ativo",
    inicio: "18/03/2026",
  },
];

function SummaryCard({ label, value }) {
  return (
    <article className="rounded-premium border border-black/10 bg-white p-5 shadow-soft">
      <p className="font-body text-xs uppercase tracking-[0.15em] text-premium-anthracite/55">
        {label}
      </p>
      <p className="mt-3 font-title text-3xl text-premium-gold">{value}</p>
    </article>
  );
}

export default function DashboardPage() {
  const { tenantId } = useTenant();
  const [summary, setSummary] = useState(mockSummary);
  const [progress, setProgress] = useState(mockProgress);
  const [students, setStudents] = useState(mockStudents);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const [summaryRes, progressRes, studentsRes] = await Promise.all([
          tenantFetch("/personal/dashboard/summary", tenantId),
          tenantFetch("/personal/dashboard/evolucao-cargas", tenantId),
          tenantFetch("/personal/alunos", tenantId),
        ]);

        if (!ignore) {
          setSummary({
            totalAlunos: summaryRes?.totalAlunos ?? mockSummary.totalAlunos,
            treinosHoje: summaryRes?.treinosHoje ?? mockSummary.treinosHoje,
            faturamentoMes:
              summaryRes?.faturamentoMes ?? mockSummary.faturamentoMes,
          });
          setProgress(
            Array.isArray(progressRes) && progressRes.length > 0
              ? progressRes
              : mockProgress,
          );
          setStudents(
            Array.isArray(studentsRes) && studentsRes.length > 0
              ? studentsRes
              : mockStudents,
          );
        }
      } catch {
        // Keeps premium preview with mock data when backend endpoints are not ready.
      }
    }

    if (tenantId) {
      loadData();
    }

    return () => {
      ignore = true;
    };
  }, [tenantId]);

  const formattedRevenue = useMemo(
    () =>
      new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(summary.faturamentoMes || 0),
    [summary.faturamentoMes],
  );

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard label="Total de Alunos" value={summary.totalAlunos} />
        <SummaryCard label="Treinos Hoje" value={summary.treinosHoje} />
        <SummaryCard label="Faturamento Mes" value={formattedRevenue} />
      </section>

      <section className="rounded-premium border border-black/10 bg-white p-5 shadow-soft">
        <div className="mb-4">
          <h2 className="font-title text-2xl text-premium-gold">
            Evolucao de Cargas
          </h2>
          <p className="font-body text-sm text-premium-anthracite/70">
            Performance media dos alunos nas ultimas semanas.
          </p>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer>
            <LineChart data={progress}>
              <CartesianGrid strokeDasharray="3 3" stroke="#efe7cc" />
              <XAxis dataKey="week" stroke="#6f6f6f" />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="carga"
                stroke="#D4AF37"
                strokeWidth={3}
                dot={{ fill: "#D4AF37", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-premium border border-black/10 bg-white p-5 shadow-soft">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-title text-2xl text-premium-gold">
            Gestao de Alunos
          </h2>
          <button
            type="button"
            className="rounded-premium bg-premium-gold px-4 py-2 font-body text-sm font-semibold text-premium-ink shadow-gold hover:brightness-105"
          >
            Novo Aluno
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-2">
            <thead>
              <tr className="font-body text-left text-xs uppercase tracking-[0.14em] text-premium-anthracite/60">
                <th className="px-3 py-2">Aluno</th>
                <th className="px-3 py-2">Status do Plano</th>
                <th className="px-3 py-2">Inicio</th>
                <th className="px-3 py-2">Acao</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr
                  key={student.id}
                  className="rounded-premium border border-black/5 bg-premium-pearl/70"
                >
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-premium-ink font-body text-xs font-semibold text-premium-gold">
                        {student.foto}
                      </span>
                      <span className="font-body font-semibold text-premium-anthracite">
                        {student.nome}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 font-body text-sm">
                    <span className="rounded-full border border-premium-gold/50 bg-premium-gold/10 px-3 py-1 text-premium-anthracite">
                      {student.planoStatus}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-body text-sm text-premium-anthracite/80">
                    {student.inicio}
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      className="rounded-premium border border-premium-gold px-3 py-1.5 font-body text-sm font-semibold text-premium-gold hover:bg-premium-gold hover:text-premium-ink"
                    >
                      Prescrever Treino
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
