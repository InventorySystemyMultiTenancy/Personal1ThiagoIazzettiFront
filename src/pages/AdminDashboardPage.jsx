import React, { useEffect, useMemo, useState } from "react";
import { BarChart3, Dumbbell, Loader2, Users, Wallet } from "lucide-react";
import {
  createStudent,
  createStudentPlan,
  formatCurrency,
  formatDate,
  listStudentPlans,
  listStudents,
} from "../lib/api.js";

function StatCard({ icon: Icon, label, value }) {
  return (
    <article className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-white/40">
            {label}
          </p>
          <p className="mt-3 font-title text-3xl text-[#f5d77a]">{value}</p>
        </div>
        <div className="rounded-2xl border border-[#d4af37]/25 bg-[#d4af37]/10 p-3 text-[#d4af37]">
          <Icon size={18} />
        </div>
      </div>
    </article>
  );
}

export default function AdminDashboardPage() {
  const [students, setStudents] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const [studentsResult, plansResult] = await Promise.all([
          listStudents(),
          listStudentPlans(),
        ]);

        if (!cancelled) {
          setStudents(Array.isArray(studentsResult) ? studentsResult : []);
          setPlans(Array.isArray(plansResult) ? plansResult : []);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(error?.message || "Nao foi possivel carregar o painel");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const activePlans = plans.filter((plan) => plan.isActive !== false).length;
    return [
      { icon: Users, label: "Alunos", value: students.length },
      { icon: Wallet, label: "Planos", value: plans.length },
      { icon: Dumbbell, label: "Ativos", value: activePlans },
    ];
  }, [plans, students.length]);

  const handleCreateQuickStudent = async () => {
    const sample = {
      fullName: `Aluno ${students.length + 1}`,
      email: `aluno${students.length + 1}@selfmachine.com`,
      phone: null,
    };

    try {
      const created = await createStudent(sample);
      setStudents((current) => [created, ...current]);
      setMessage(`Aluno criado: ${created.fullName}`);
    } catch (error) {
      setMessage(error?.message || "Nao foi possivel criar o aluno");
    }
  };

  const handleCreateQuickPlan = async () => {
    try {
      const created = await createStudentPlan({
        name: `Plano ${plans.length + 1}`,
        description: "Plano premium criado pelo painel.",
        monthlyPriceCents: 14900,
      });
      setPlans((current) => [created, ...current]);
      setMessage(`Plano criado: ${created.name}`);
    } catch (error) {
      setMessage(error?.message || "Nao foi possivel criar o plano");
    }
  };

  return (
    <main className="space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.2),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-white/40">
              Painel do personal
            </p>
            <h1 className="mt-2 font-title text-4xl text-[#f5d77a]">
              Visao geral
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/68">
              O painel agora conversa com o backend e mostra alunos, planos e
              opcoes rapidas para manter a operacao viva.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleCreateQuickStudent}
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/75 transition hover:border-[#d4af37]/50 hover:text-white"
            >
              Novo aluno
            </button>
            <button
              type="button"
              onClick={handleCreateQuickPlan}
              className="rounded-full bg-[#d4af37] px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110"
            >
              Novo plano
            </button>
          </div>
        </div>
      </section>

      {message ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
          {message}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-white/65">
          <Loader2 className="animate-spin text-[#d4af37]" size={18} />
          Carregando dados do painel...
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-white/40">
                Alunos ativos
              </p>
              <h2 className="mt-2 font-title text-2xl text-[#f5d77a]">
                Carteira atual
              </h2>
            </div>
            <BarChart3 className="text-[#d4af37]" />
          </div>

          <div className="mt-5 space-y-3">
            {students.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-sm text-white/65">
                Nenhum aluno encontrado.
              </p>
            ) : (
              students.map((student) => (
                <div
                  key={student.id}
                  className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/30 px-4 py-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-semibold text-white">
                      {student.fullName}
                    </p>
                    <p className="text-sm text-white/55">
                      {student.email || "Sem email"}
                    </p>
                  </div>
                  <div className="text-sm text-white/60">
                    Entrou em {formatDate(student.createdAt)}
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-white/40">
                Planos de assinatura
              </p>
              <h2 className="mt-2 font-title text-2xl text-[#f5d77a]">
                Biblioteca real
              </h2>
            </div>
            <Wallet className="text-[#d4af37]" />
          </div>

          <div className="mt-5 space-y-3">
            {plans.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-sm text-white/65">
                Nenhum plano cadastrado.
              </p>
            ) : (
              plans.map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-white">{plan.name}</p>
                      <p className="text-sm text-white/55">
                        {plan.description || "Plano premium"}
                      </p>
                    </div>
                    <p className="font-title text-xl text-[#f5d77a]">
                      {formatCurrency((plan.monthlyPriceCents || 0) / 100)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
