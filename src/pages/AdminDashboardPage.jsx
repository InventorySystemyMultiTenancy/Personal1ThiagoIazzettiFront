import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Dumbbell,
  Loader2,
  Users,
  Wallet,
  MessageSquare,
  Calendar,
  TrendingUp,
  AlertCircle,
  Plus,
  ChevronRight,
  Edit2,
  Trash2,
} from "lucide-react";
import {
  createStudent,
  createStudentPlan,
  formatCurrency,
  formatDate,
  listStudentPlans,
  listStudents,
} from "../lib/api.js";
import { useTenant } from "../contexts/TenantContext.jsx";
import WorkoutBuilderPage from "./WorkoutBuilderPage.jsx";

function StatCard({ icon: Icon, label, value, trend }) {
  return (
    <article className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-5 transition hover:border-[#d9b341]/30">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-white/40">
            {label}
          </p>
          <p className="mt-3 font-title text-3xl text-[#d9c179]">{value}</p>
          {trend && <p className="mt-2 text-xs text-white/50">{trend}</p>}
        </div>
        <div className="rounded-2xl border border-[#d9b341]/25 bg-[#d9b341]/10 p-3 text-[#d9b341]">
          <Icon size={18} />
        </div>
      </div>
    </article>
  );
}

function TabButton({ active, icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
        active
          ? "border border-[#d9b341]/50 bg-[#d9b341]/15 text-[#d9c179]"
          : "border border-white/10 text-white/60 hover:border-white/20 hover:text-white/80"
      }`}
    >
      {Icon && <Icon size={16} />}
      {label}
    </button>
  );
}

export default function AdminDashboardPage() {
  const { tenantId } = useTenant();
  const [students, setStudents] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("visao-geral");

  // Form states for creating/editing
  const [newStudentForm, setNewStudentForm] = useState({
    fullName: "",
    email: "",
    phone: "",
  });
  const [newPlanForm, setNewPlanForm] = useState({
    name: "",
    description: "",
    monthlyPriceCents: 0,
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const [studentsResult, plansResult] = await Promise.all([
          listStudents(tenantId),
          listStudentPlans(tenantId),
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

    if (tenantId) {
      load();
    }

    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const stats = useMemo(() => {
    const activePlans = plans.filter((plan) => plan.isActive !== false).length;
    const inactiveStudents = students.filter((s) => {
      const lastActivity = new Date(s.lastActivityAt || 0);
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      return lastActivity < fiveDaysAgo;
    }).length;

    return [
      { icon: Users, label: "Alunos ativos", value: students.length },
      { icon: Wallet, label: "Planos", value: activePlans },
      {
        icon: TrendingUp,
        label: "Inativos (5+ dias)",
        value: inactiveStudents,
      },
      {
        icon: Dumbbell,
        label: "Potencial mensal",
        value: formatCurrency(
          plans.reduce((sum, p) => sum + (p.monthlyPriceCents || 0), 0) / 100,
        ),
      },
    ];
  }, [plans, students]);

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    if (!newStudentForm.fullName.trim() || !newStudentForm.email.trim()) {
      setMessage("Nome e email sao obrigatorios");
      return;
    }

    try {
      const created = await createStudent(newStudentForm, tenantId);
      setStudents((current) => [created, ...current]);
      setNewStudentForm({ fullName: "", email: "", phone: "" });
      setMessage(`Aluno criado com sucesso: ${created.fullName}`);
    } catch (error) {
      setMessage(error?.message || "Nao foi possivel criar o aluno");
    }
  };

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    if (!newPlanForm.name.trim()) {
      setMessage("Nome do plano e obrigatorio");
      return;
    }

    try {
      const created = await createStudentPlan(newPlanForm, tenantId);
      setPlans((current) => [created, ...current]);
      setNewPlanForm({ name: "", description: "", monthlyPriceCents: 0 });
      setMessage(`Plano criado com sucesso: ${created.name}`);
    } catch (error) {
      setMessage(error?.message || "Nao foi possivel criar o plano");
    }
  };

  return (
    <main className="space-y-6 pb-10">
      {/* Header */}
      <section className="rounded-4xl border border-white/10 bg-[radial-gradient(circle_at_top,rgba(217,179,65,0.2),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-white/40">
            Dashboard do Personal
          </p>
          <h1 className="mt-2 font-title text-4xl text-[#f2e3b3]">
            Gerencie sua academia
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/68">
            Acompanhe alunos, crie planos, construa treinos e gerencie toda a
            sua operacao em um unico lugar. Tudo isolado no seu tenant.
          </p>
        </div>
      </section>

      {message ? (
        <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
          <AlertCircle
            size={18}
            className="mt-0.5 flex-shrink-0 text-[#d9b341]"
          />
          <p>{message}</p>
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-white/65">
          <Loader2 className="animate-spin text-[#d9b341]" size={18} />
          Carregando dados do painel...
        </div>
      ) : null}

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
        <TabButton
          active={activeTab === "visao-geral"}
          icon={BarChart3}
          label="Visão Geral"
          onClick={() => setActiveTab("visao-geral")}
        />
        <TabButton
          active={activeTab === "alunos"}
          icon={Users}
          label="Alunos"
          onClick={() => setActiveTab("alunos")}
        />
        <TabButton
          active={activeTab === "planos"}
          icon={Wallet}
          label="Planos"
          onClick={() => setActiveTab("planos")}
        />
        <TabButton
          active={activeTab === "treinos"}
          icon={Dumbbell}
          label="Treinos"
          onClick={() => setActiveTab("treinos")}
        />
        <TabButton
          active={activeTab === "comunicacao"}
          icon={MessageSquare}
          label="Comunicação"
          onClick={() => setActiveTab("comunicacao")}
        />
      </div>

      {/* TAB: VISAO GERAL */}
      {activeTab === "visao-geral" && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <StatCard key={stat.label} {...stat} />
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Alertas de Inatividade */}
            <article className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-white/40">
                    Atencao
                  </p>
                  <h2 className="mt-2 font-title text-2xl text-[#d9c179]">
                    Alunos inativos
                  </h2>
                </div>
                <AlertCircle className="text-[#d9b341]" size={24} />
              </div>

              <div className="mt-5 space-y-2">
                {students.filter((s) => {
                  const lastActivity = new Date(s.lastActivityAt || 0);
                  const fiveDaysAgo = new Date(
                    Date.now() - 5 * 24 * 60 * 60 * 1000,
                  );
                  return lastActivity < fiveDaysAgo;
                }).length === 0 ? (
                  <p className="text-sm text-white/60">
                    Nenhum aluno inativo. Perfeito!
                  </p>
                ) : (
                  students
                    .filter((s) => {
                      const lastActivity = new Date(s.lastActivityAt || 0);
                      const fiveDaysAgo = new Date(
                        Date.now() - 5 * 24 * 60 * 60 * 1000,
                      );
                      return lastActivity < fiveDaysAgo;
                    })
                    .map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm"
                      >
                        <span className="text-white">{student.fullName}</span>
                        <span className="text-xs text-white/50">
                          Inativo por dias
                        </span>
                      </div>
                    ))
                )}
              </div>
            </article>

            {/* Proximos Aniversarios */}
            <article className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-white/40">
                    Relacionamento
                  </p>
                  <h2 className="mt-2 font-title text-2xl text-[#d9c179]">
                    Aniversariantes
                  </h2>
                </div>
                <Calendar className="text-[#d9b341]" size={24} />
              </div>

              <div className="mt-5 space-y-2">
                <p className="text-sm text-white/60">
                  Nenhum aniversario proximos nos proximos 7 dias.
                </p>
              </div>
            </article>
          </div>
        </div>
      )}

      {/* TAB: ALUNOS */}
      {activeTab === "alunos" && (
        <div className="space-y-6">
          <article className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6">
            <h2 className="font-title text-2xl text-[#d9c179]">
              Cadastrar novo aluno
            </h2>
            <form className="mt-6 space-y-4" onSubmit={handleCreateStudent}>
              <label className="block text-sm text-white/70">
                Nome completo
                <input
                  type="text"
                  name="fullName"
                  value={newStudentForm.fullName}
                  onChange={(e) =>
                    setNewStudentForm((prev) => ({
                      ...prev,
                      fullName: e.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none transition placeholder:text-white/30 focus:border-[#d9b341]/50"
                  placeholder="Ex: João Silva"
                />
              </label>

              <label className="block text-sm text-white/70">
                Email
                <input
                  type="email"
                  name="email"
                  value={newStudentForm.email}
                  onChange={(e) =>
                    setNewStudentForm((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none transition placeholder:text-white/30 focus:border-[#d9b341]/50"
                  placeholder="joao@email.com"
                />
              </label>

              <label className="block text-sm text-white/70">
                Telefone (opcional)
                <input
                  type="tel"
                  name="phone"
                  value={newStudentForm.phone}
                  onChange={(e) =>
                    setNewStudentForm((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none transition placeholder:text-white/30 focus:border-[#d9b341]/50"
                  placeholder="(11) 99999-9999"
                />
              </label>

              <button
                type="submit"
                className="mt-4 flex items-center gap-2 rounded-full bg-[#d9b341] px-6 py-3 font-semibold text-black transition hover:brightness-110"
              >
                <Plus size={16} />
                Criar aluno
              </button>
            </form>
          </article>

          <article className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6">
            <h2 className="font-title text-2xl text-[#d9c179]">
              Alunos cadastrados ({students.length})
            </h2>

            <div className="mt-5 space-y-3">
              {students.length === 0 ? (
                <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-sm text-white/65">
                  Nenhum aluno cadastrado ainda. Comece criando seu primeiro
                  aluno!
                </p>
              ) : (
                students.map((student) => (
                  <div
                    key={student.id}
                    className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-white">
                        {student.fullName}
                      </p>
                      <p className="text-sm text-white/55">
                        {student.email || "Sem email"}
                      </p>
                      <p className="mt-1 text-xs text-white/40">
                        Cadastrado em {formatDate(student.createdAt)}
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
                        className="rounded-lg border border-white/10 p-2 text-white/60 transition hover:text-red-400"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        </div>
      )}

      {/* TAB: PLANOS */}
      {activeTab === "planos" && (
        <div className="space-y-6">
          <article className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6">
            <h2 className="font-title text-2xl text-[#d9c179]">
              Criar novo plano de assinatura
            </h2>
            <form className="mt-6 space-y-4" onSubmit={handleCreatePlan}>
              <label className="block text-sm text-white/70">
                Nome do plano
                <input
                  type="text"
                  name="name"
                  value={newPlanForm.name}
                  onChange={(e) =>
                    setNewPlanForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none transition placeholder:text-white/30 focus:border-[#d9b341]/50"
                  placeholder="Ex: Plano Premium"
                />
              </label>

              <label className="block text-sm text-white/70">
                Descricao
                <textarea
                  name="description"
                  value={newPlanForm.description}
                  onChange={(e) =>
                    setNewPlanForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none transition placeholder:text-white/30 focus:border-[#d9b341]/50"
                  placeholder="Descreva o plano..."
                  rows={3}
                />
              </label>

              <label className="block text-sm text-white/70">
                Preco mensal (R$)
                <input
                  type="number"
                  name="monthlyPrice"
                  value={newPlanForm.monthlyPriceCents / 100}
                  onChange={(e) =>
                    setNewPlanForm((prev) => ({
                      ...prev,
                      monthlyPriceCents: Math.round(
                        parseFloat(e.target.value || 0) * 100,
                      ),
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none transition placeholder:text-white/30 focus:border-[#d9b341]/50"
                  placeholder="149.90"
                  step="0.01"
                  min="0"
                />
              </label>

              <button
                type="submit"
                className="mt-4 flex items-center gap-2 rounded-full bg-[#d9b341] px-6 py-3 font-semibold text-black transition hover:brightness-110"
              >
                <Plus size={16} />
                Criar plano
              </button>
            </form>
          </article>

          <article className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6">
            <h2 className="font-title text-2xl text-[#d9c179]">
              Planos de assinatura ({plans.length})
            </h2>

            <div className="mt-5 space-y-3">
              {plans.length === 0 ? (
                <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-sm text-white/65">
                  Nenhum plano criado ainda. Comece criando seu primeiro plano!
                </p>
              ) : (
                plans.map((plan) => (
                  <div
                    key={plan.id}
                    className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-white">{plan.name}</p>
                      <p className="mt-1 text-sm text-white/55">
                        {plan.description || "Plano premium"}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-title text-xl text-[#d9c179]">
                        {formatCurrency((plan.monthlyPriceCents || 0) / 100)}
                        /mês
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="rounded-lg border border-white/10 p-2 text-white/60 transition hover:text-[#d9b341]"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-white/10 p-2 text-white/60 transition hover:text-red-400"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        </div>
      )}

      {/* TAB: TREINOS */}
      {activeTab === "treinos" && <WorkoutBuilderPage />}

      {/* TAB: COMUNICACAO */}
      {activeTab === "comunicacao" && (
        <article className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6">
          <h2 className="font-title text-2xl text-[#d9c179]">
            Area de Comunicacao
          </h2>
          <p className="mt-3 text-white/65">
            Chat interno, repositorio de arquivos (PDFs de dietas, orientacoes)
            e notificacoes para alunos.
          </p>

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 px-6 py-8 text-center">
            <MessageSquare
              className="mx-auto mb-3 text-[#d9b341]/50"
              size={32}
            />
            <p className="text-white/60">
              A area de comunicacao sera ativada em breve. Fique atento!
            </p>
          </div>
        </article>
      )}
    </main>
  );
}
