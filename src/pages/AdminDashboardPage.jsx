import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
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
  updateStudent,
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

function toDateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function getDueStatus(planDueDate) {
  if (!planDueDate) {
    return {
      key: "no-date",
      label: "Sem vencimento",
      detail: "Defina uma data para alertas",
      badgeClass: "border-white/20 bg-white/10 text-white/70",
      cardClass: "border-white/10",
    };
  }

  const now = new Date();
  const due = new Date(planDueDate);
  const diffMs = due.getTime() - now.getTime();
  const days = Math.ceil(diffMs / (24 * 60 * 60 * 1000));

  if (days < 0) {
    return {
      key: "overdue",
      label: "Vencido",
      detail: `Atrasado ha ${Math.abs(days)} dia(s)`,
      badgeClass: "border-red-500/45 bg-red-500/20 text-red-200",
      cardClass: "border-red-500/35 bg-[rgba(127,29,29,0.24)]",
    };
  }

  if (days <= 6) {
    return {
      key: "due-soon",
      label: "Vence em breve",
      detail: `Faltam ${days} dia(s)`,
      badgeClass: "border-amber-400/45 bg-amber-400/15 text-amber-200",
      cardClass: "border-amber-400/35 bg-[rgba(120,53,15,0.24)]",
    };
  }

  return {
    key: "ok",
    label: "Em dia",
    detail: `Faltam ${days} dia(s)`,
    badgeClass: "border-emerald-400/45 bg-emerald-400/15 text-emerald-200",
    cardClass: "border-emerald-400/30 bg-[rgba(6,78,59,0.2)]",
  };
}

export default function AdminDashboardPage() {
  const location = useLocation();
  const { tenantId } = useTenant();
  const [students, setStudents] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("visao-geral");
  const [editingStudentId, setEditingStudentId] = useState("");
  const [editStudentForm, setEditStudentForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    birthDate: "",
    alunoPlanId: "",
    planDueDate: "",
    isActive: true,
  });

  // Form states for creating/editing
  const [newStudentForm, setNewStudentForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    birthDate: "",
    alunoPlanId: "",
    planDueDate: "",
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

  useEffect(() => {
    if (location.pathname.includes("/admin/alunos")) {
      setActiveTab("alunos");
      return;
    }
    if (location.pathname.includes("/admin/planos")) {
      setActiveTab("planos");
      return;
    }
    if (location.pathname.includes("/admin/treinos")) {
      setActiveTab("treinos");
      return;
    }
    if (location.pathname.includes("/admin/agenda")) {
      setActiveTab("comunicacao");
      return;
    }
    setActiveTab("visao-geral");
  }, [location.pathname]);

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
      const created = await createStudent(
        {
          fullName: newStudentForm.fullName,
          email: newStudentForm.email,
          phone: newStudentForm.phone,
          birthDate: newStudentForm.birthDate || null,
          alunoPlanId: newStudentForm.alunoPlanId || null,
          planDueDate: newStudentForm.planDueDate || null,
        },
        tenantId,
      );
      setStudents((current) => [created, ...current]);
      setNewStudentForm({
        fullName: "",
        email: "",
        phone: "",
        birthDate: "",
        alunoPlanId: "",
        planDueDate: "",
      });
      setMessage(`Aluno criado com sucesso: ${created.fullName}`);
    } catch (error) {
      setMessage(error?.message || "Nao foi possivel criar o aluno");
    }
  };

  const startEditStudent = (student) => {
    setEditingStudentId(student.id);
    setEditStudentForm({
      fullName: student.fullName || "",
      email: student.email || "",
      phone: student.phone || "",
      birthDate: toDateInputValue(student.birthDate),
      alunoPlanId: student.alunoPlanId || "",
      planDueDate: toDateInputValue(student.planDueDate),
      isActive: student.isActive !== false,
    });
  };

  const handleSaveStudent = async (studentId) => {
    try {
      const updated = await updateStudent(
        studentId,
        {
          fullName: editStudentForm.fullName,
          email: editStudentForm.email || null,
          phone: editStudentForm.phone || null,
          birthDate: editStudentForm.birthDate || null,
          alunoPlanId: editStudentForm.alunoPlanId || null,
          planDueDate: editStudentForm.planDueDate || null,
          isActive: Boolean(editStudentForm.isActive),
        },
        tenantId,
      );

      setStudents((current) =>
        current.map((item) => (item.id === studentId ? updated : item)),
      );
      setEditingStudentId("");
      setMessage(`Aluno atualizado: ${updated.fullName}`);
    } catch (error) {
      setMessage(error?.message || "Nao foi possivel atualizar o aluno");
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

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm text-white/70">
                  Data de nascimento
                  <input
                    type="date"
                    name="birthDate"
                    value={newStudentForm.birthDate}
                    onChange={(e) =>
                      setNewStudentForm((prev) => ({
                        ...prev,
                        birthDate: e.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none transition placeholder:text-white/30 focus:border-[#d9b341]/50"
                  />
                </label>

                <label className="block text-sm text-white/70">
                  Vencimento do plano
                  <input
                    type="date"
                    name="planDueDate"
                    value={newStudentForm.planDueDate}
                    onChange={(e) =>
                      setNewStudentForm((prev) => ({
                        ...prev,
                        planDueDate: e.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none transition placeholder:text-white/30 focus:border-[#d9b341]/50"
                  />
                </label>
              </div>

              <label className="block text-sm text-white/70">
                Plano do aluno
                <select
                  name="alunoPlanId"
                  value={newStudentForm.alunoPlanId}
                  onChange={(e) =>
                    setNewStudentForm((prev) => ({
                      ...prev,
                      alunoPlanId: e.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none transition focus:border-[#d9b341]/50"
                >
                  <option value="">Sem plano</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} -{" "}
                      {formatCurrency((plan.monthlyPriceCents || 0) / 100)}
                    </option>
                  ))}
                </select>
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

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-red-500/35 bg-red-500/10 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.14em] text-red-200/80">
                  Vencidos
                </p>
                <p className="mt-2 font-title text-2xl text-red-200">
                  {
                    students.filter(
                      (s) => getDueStatus(s.planDueDate).key === "overdue",
                    ).length
                  }
                </p>
              </div>
              <div className="rounded-2xl border border-amber-400/35 bg-amber-400/10 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.14em] text-amber-200/80">
                  Vencem em ate 6 dias
                </p>
                <p className="mt-2 font-title text-2xl text-amber-100">
                  {
                    students.filter(
                      (s) => getDueStatus(s.planDueDate).key === "due-soon",
                    ).length
                  }
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-400/35 bg-emerald-400/10 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.14em] text-emerald-200/80">
                  Em dia
                </p>
                <p className="mt-2 font-title text-2xl text-emerald-100">
                  {
                    students.filter(
                      (s) => getDueStatus(s.planDueDate).key === "ok",
                    ).length
                  }
                </p>
              </div>
            </div>

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
                    className={`rounded-2xl border px-4 py-4 ${getDueStatus(student.planDueDate).cardClass}`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
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

                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${getDueStatus(student.planDueDate).badgeClass}`}
                        >
                          {getDueStatus(student.planDueDate).label}
                        </span>
                        <span className="text-xs text-white/60">
                          {getDueStatus(student.planDueDate).detail}
                        </span>
                        <button
                          type="button"
                          onClick={() => startEditStudent(student)}
                          className="rounded-lg border border-white/10 p-2 text-white/60 transition hover:text-[#d9b341]"
                        >
                          <Edit2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                        <p className="text-xs text-white/45">Plano</p>
                        <p className="mt-1 font-semibold text-white">
                          {student.alunoPlan?.name || "Sem plano"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                        <p className="text-xs text-white/45">Mensalidade</p>
                        <p className="mt-1 font-semibold text-[#d9c179]">
                          {student.alunoPlan
                            ? formatCurrency(
                                (student.alunoPlan.monthlyPriceCents || 0) /
                                  100,
                              )
                            : "-"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                        <p className="text-xs text-white/45">Vencimento</p>
                        <p className="mt-1 font-semibold text-white">
                          {student.planDueDate
                            ? formatDate(student.planDueDate)
                            : "Nao definido"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                        <p className="text-xs text-white/45">Telefone</p>
                        <p className="mt-1 font-semibold text-white">
                          {student.phone || "Nao informado"}
                        </p>
                      </div>
                    </div>

                    {editingStudentId === student.id ? (
                      <div className="mt-4 rounded-2xl border border-white/10 bg-black/35 p-4">
                        <p className="mb-3 text-sm font-semibold text-[#d9c179]">
                          Editar aluno
                        </p>
                        <div className="grid gap-3 md:grid-cols-2">
                          <input
                            value={editStudentForm.fullName}
                            onChange={(e) =>
                              setEditStudentForm((prev) => ({
                                ...prev,
                                fullName: e.target.value,
                              }))
                            }
                            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#d9b341]/50"
                            placeholder="Nome completo"
                          />
                          <input
                            type="email"
                            value={editStudentForm.email}
                            onChange={(e) =>
                              setEditStudentForm((prev) => ({
                                ...prev,
                                email: e.target.value,
                              }))
                            }
                            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#d9b341]/50"
                            placeholder="Email"
                          />
                          <input
                            value={editStudentForm.phone}
                            onChange={(e) =>
                              setEditStudentForm((prev) => ({
                                ...prev,
                                phone: e.target.value,
                              }))
                            }
                            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#d9b341]/50"
                            placeholder="Telefone"
                          />
                          <input
                            type="date"
                            value={editStudentForm.birthDate}
                            onChange={(e) =>
                              setEditStudentForm((prev) => ({
                                ...prev,
                                birthDate: e.target.value,
                              }))
                            }
                            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#d9b341]/50"
                          />
                          <select
                            value={editStudentForm.alunoPlanId}
                            onChange={(e) =>
                              setEditStudentForm((prev) => ({
                                ...prev,
                                alunoPlanId: e.target.value,
                              }))
                            }
                            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#d9b341]/50"
                          >
                            <option value="">Sem plano</option>
                            {plans.map((plan) => (
                              <option key={plan.id} value={plan.id}>
                                {plan.name}
                              </option>
                            ))}
                          </select>
                          <input
                            type="date"
                            value={editStudentForm.planDueDate}
                            onChange={(e) =>
                              setEditStudentForm((prev) => ({
                                ...prev,
                                planDueDate: e.target.value,
                              }))
                            }
                            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#d9b341]/50"
                          />
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          <label className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80">
                            <input
                              type="checkbox"
                              checked={editStudentForm.isActive}
                              onChange={(e) =>
                                setEditStudentForm((prev) => ({
                                  ...prev,
                                  isActive: e.target.checked,
                                }))
                              }
                            />
                            Aluno ativo
                          </label>

                          <button
                            type="button"
                            onClick={() => handleSaveStudent(student.id)}
                            className="rounded-full bg-[#d9b341] px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110"
                          >
                            Salvar alteracoes
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingStudentId("")}
                            className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/70 transition hover:text-white"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : null}
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
