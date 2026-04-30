import { useEffect, useMemo, useState, useRef } from "react";
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
  Send,
  ChevronLeft,
} from "lucide-react";
import {
  createStudent,
  createStudentPlan,
  formatCurrency,
  formatDate,
  listDiets,
  listStudentPlans,
  listStudents,
  listWorkoutPlans,
  updateStudent,
  listMessages,
  sendMessage,
} from "../lib/api.js";
import { getBillingStatus } from "../lib/billingStatus.js";
import { useTenant } from "../contexts/TenantContext.jsx";
import WorkoutBuilderPage from "./WorkoutBuilderPage.jsx";

function StatCard({ icon: Icon, label, value, sub, color = "#b5f03c" }) {
  return (
    <article
      className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0f0f0f] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/12 hover:shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
      style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04)` }}
    >
      {/* Top row: icon */}
      <div
        className="mb-4 inline-flex rounded-xl p-2.5 transition-all duration-300 group-hover:scale-110"
        style={{ background: `${color}15`, color }}
      >
        <Icon size={18} strokeWidth={2} />
      </div>
      {/* Value */}
      <p className="text-3xl font-black text-white leading-none tracking-tight">
        {value}
      </p>
      {/* Label */}
      <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">
        {label}
      </p>
      {sub && <p className="mt-1.5 text-[11px] text-white/25">{sub}</p>}
      {/* Bottom accent line */}
      <div
        className="absolute bottom-0 left-0 h-0.5 w-0 rounded-full transition-all duration-500 group-hover:w-full"
        style={{ background: `linear-gradient(90deg, ${color}, transparent)` }}
      />
      {/* Glow blob */}
      <div
        className="pointer-events-none absolute -bottom-8 -right-8 h-24 w-24 rounded-full blur-3xl opacity-10 transition-opacity duration-300 group-hover:opacity-25"
        style={{ background: color }}
      />
    </article>
  );
}

function TabButton({ active, icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] transition-all duration-200 ${
        active
          ? "bg-[#b5f03c]/10 text-[#b5f03c] shadow-[inset_0_0_0_1px_rgba(181,240,60,0.25)]"
          : "text-white/30 hover:bg-white/[0.04] hover:text-white/60"
      }`}
    >
      {Icon && <Icon size={13} strokeWidth={2.5} />}
      <span className="hidden sm:inline">{label}</span>
      {active && (
        <span className="absolute bottom-0 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-[#b5f03c]" />
      )}
    </button>
  );
}

function toDateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function buildForwardMessage(kind, item) {
  const payload = {
    kind,
    id: item?.id,
    title: item?.title || item?.name || "Item",
    description: item?.objective || item?.description || "",
  };
  return `__FORWARD__:${JSON.stringify(payload)}`;
}

function parseForwardMessage(content) {
  if (typeof content !== "string" || !content.startsWith("__FORWARD__:")) {
    return null;
  }

  try {
    const parsed = JSON.parse(content.slice("__FORWARD__:".length));
    if (!parsed || (parsed.kind !== "workout" && parsed.kind !== "diet")) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
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
    if (location.pathname.includes("/admin/comunicacao")) {
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
      {
        icon: Users,
        label: "Alunos ativos",
        value: students.length,
        color: "#b5f03c",
      },
      { icon: Wallet, label: "Planos", value: activePlans, color: "#60a5fa" },
      {
        icon: TrendingUp,
        label: "Inativos (5+ dias)",
        value: inactiveStudents,
        color: "#f87171",
      },
      {
        icon: Dumbbell,
        label: "Potencial mensal",
        value: formatCurrency(
          plans.reduce((sum, p) => sum + (p.monthlyPriceCents || 0), 0) / 100,
        ),
        color: "#4ade80",
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
    <main className="space-y-6 pb-12">
      {/* Header */}
      <section className="flex items-center justify-between">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.45em] text-white/20">
            Painel
          </p>
          <h1 className="mt-1 text-2xl font-black text-white leading-tight tracking-tight">
            Visão Geral
          </h1>
        </div>
        {loading && (
          <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5">
            <Loader2 className="animate-spin text-[#b5f03c]/60" size={13} />
            <span className="text-[10px] text-white/30">Carregando...</span>
          </div>
        )}
      </section>

      {message ? (
        <div className="flex items-center gap-3 rounded-xl border border-[#b5f03c]/15 bg-[#b5f03c]/5 px-4 py-3 text-xs text-white/60">
          <AlertCircle size={14} className="flex-shrink-0 text-[#b5f03c]" />
          {message}
        </div>
      ) : null}

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 rounded-2xl border border-white/[0.06] bg-[#0d0d0d] p-1.5">
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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <StatCard key={stat.label} {...stat} />
            ))}
          </div>

          {/* Billing distribution bar */}
          {students.length > 0 &&
            (() => {
              const paid = students.filter(
                (s) => getBillingStatus(s).key === "paid",
              ).length;
              const pending = students.filter(
                (s) => getBillingStatus(s).key === "pending",
              ).length;
              const overdue = students.filter(
                (s) => getBillingStatus(s).key === "overdue",
              ).length;
              const total = students.length;
              return (
                <article className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-white/30 mb-4">
                    Status de Pagamento
                  </p>
                  <div className="flex h-2 w-full overflow-hidden rounded-full gap-0.5">
                    <div
                      className="h-full rounded-l-full bg-emerald-400 transition-all"
                      style={{ width: `${(paid / total) * 100}%` }}
                    />
                    <div
                      className="h-full bg-amber-400 transition-all"
                      style={{ width: `${(pending / total) * 100}%` }}
                    />
                    <div
                      className="h-full rounded-r-full bg-red-400 transition-all"
                      style={{ width: `${(overdue / total) * 100}%` }}
                    />
                  </div>
                  <div className="mt-4 flex gap-5 text-xs text-white/50">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      {paid} pagos
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-400" />
                      {pending} pendentes
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-red-400" />
                      {overdue} atrasados
                    </span>
                  </div>
                </article>
              );
            })()}

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Alertas de Inatividade */}
            <article className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-white/30">
                  Alunos inativos
                </p>
                <AlertCircle className="text-red-400/60" size={15} />
              </div>
              <div className="space-y-2">
                {students.filter((s) => {
                  const lastActivity = new Date(s.lastActivityAt || 0);
                  const fiveDaysAgo = new Date(
                    Date.now() - 5 * 24 * 60 * 60 * 1000,
                  );
                  return lastActivity < fiveDaysAgo;
                }).length === 0 ? (
                  <p className="text-xs text-white/40">
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
                        className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2"
                      >
                        <span className="text-sm text-white/80">
                          {student.fullName}
                        </span>
                        <span className="text-[10px] text-white/35">
                          Inativo
                        </span>
                      </div>
                    ))
                )}
              </div>
            </article>

            {/* Aniversariantes */}
            <article className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-white/30">
                  Aniversariantes
                </p>
                <Calendar className="text-[#b5f03c]/50" size={15} />
              </div>
              <p className="text-xs text-white/40">
                Nenhum aniversário próximo nos próximos 7 dias.
              </p>
            </article>
          </div>
        </div>
      )}

      {/* TAB: ALUNOS */}
      {activeTab === "alunos" && (
        <div className="space-y-6">
          <article className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6">
            <h2 className="mb-5 text-sm font-bold text-white/60">
              Cadastrar novo aluno
            </h2>
            <form className="space-y-4" onSubmit={handleCreateStudent}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">
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
                    className="mt-2 w-full rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-2.5 text-sm font-normal text-white outline-none transition placeholder:text-white/20 focus:border-[#b5f03c]/40"
                    placeholder="Ex: João Silva"
                  />
                </label>
                <label className="block text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">
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
                    className="mt-2 w-full rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-2.5 text-sm font-normal text-white outline-none transition placeholder:text-white/20 focus:border-[#b5f03c]/40"
                    placeholder="joao@email.com"
                  />
                </label>
                <label className="block text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">
                  Telefone
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
                    className="mt-2 w-full rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-2.5 text-sm font-normal text-white outline-none transition placeholder:text-white/20 focus:border-[#b5f03c]/40"
                    placeholder="(11) 99999-9999"
                  />
                </label>
                <label className="block text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">
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
                    className="mt-2 w-full rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-2.5 text-sm font-normal text-white outline-none transition focus:border-[#b5f03c]/40"
                  />
                </label>
                <label className="block text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">
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
                    className="mt-2 w-full rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-2.5 text-sm font-normal text-white outline-none transition focus:border-[#b5f03c]/40"
                  />
                </label>
                <label className="block text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">
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
                    className="mt-2 w-full rounded-lg border border-white/[0.07] bg-[#111] px-3 py-2.5 text-sm font-normal text-white outline-none transition focus:border-[#b5f03c]/40"
                  >
                    <option value="">Sem plano</option>
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} —{" "}
                        {formatCurrency((plan.monthlyPriceCents || 0) / 100)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <button
                type="submit"
                className="flex items-center gap-2 rounded-lg bg-[#b5f03c] px-5 py-2.5 text-xs font-bold uppercase tracking-[0.2em] text-black transition hover:brightness-110"
              >
                <Plus size={14} />
                Criar aluno
              </button>
            </form>
          </article>

          <article className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white/60">
                Alunos cadastrados
                <span className="ml-2 rounded-md bg-white/[0.07] px-2 py-0.5 text-xs font-normal text-white/40">
                  {students.length}
                </span>
              </h2>
              <div className="flex gap-4 text-xs text-white/35">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                  {
                    students.filter(
                      (s) => getBillingStatus(s).key === "overdue",
                    ).length
                  }{" "}
                  atrasados
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  {
                    students.filter(
                      (s) => getBillingStatus(s).key === "pending",
                    ).length
                  }{" "}
                  pendentes
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {
                    students.filter((s) => getBillingStatus(s).key === "paid")
                      .length
                  }{" "}
                  pagos
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {students.length === 0 ? (
                <p className="rounded-lg border border-white/[0.07] px-4 py-6 text-center text-sm text-white/35">
                  Nenhum aluno cadastrado ainda.
                </p>
              ) : (
                students.map((student) => {
                  const billingStatus = getBillingStatus(student);
                  return (
                    <div
                      key={student.id}
                      className={`rounded-xl border px-4 py-4 transition-all duration-200 hover:bg-white/[0.02] ${billingStatus.cardClass}`}
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {student.fullName}
                          </p>
                          <p className="text-xs text-white/40 mt-0.5">
                            {student.email || "Sem email"}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] ${billingStatus.badgeClass}`}
                          >
                            {billingStatus.shortLabel}
                          </span>
                          <span className="text-[10px] text-white/30">
                            {billingStatus.detail}
                          </span>
                          <button
                            type="button"
                            onClick={() => startEditStudent(student)}
                            className="rounded-lg border border-white/[0.07] p-1.5 text-white/35 transition hover:border-[#b5f03c]/30 hover:text-[#b5f03c]"
                          >
                            <Edit2 size={13} />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2 text-xs md:grid-cols-2 xl:grid-cols-5">
                        <div className="rounded-lg border border-white/[0.05] bg-black/20 px-3 py-2">
                          <p className="text-white/25 text-[10px]">Plano</p>
                          <p className="mt-0.5 font-semibold text-white/75">
                            {student.alunoPlan?.name || "Sem plano"}
                          </p>
                        </div>
                        <div className="rounded-lg border border-white/[0.05] bg-black/20 px-3 py-2">
                          <p className="text-white/25 text-[10px]">
                            Mensalidade
                          </p>
                          <p className="mt-0.5 font-semibold text-[#b5f03c]">
                            {student.alunoPlan
                              ? formatCurrency(
                                  (student.alunoPlan.monthlyPriceCents || 0) /
                                    100,
                                )
                              : "—"}
                          </p>
                        </div>
                        <div className="rounded-lg border border-white/[0.05] bg-black/20 px-3 py-2">
                          <p className="text-white/25 text-[10px]">Status</p>
                          <p
                            className={`mt-0.5 font-semibold ${billingStatus.accentClass}`}
                          >
                            {billingStatus.label}
                          </p>
                        </div>
                        <div className="rounded-lg border border-white/[0.05] bg-black/20 px-3 py-2">
                          <p className="text-white/25 text-[10px]">
                            Vencimento
                          </p>
                          <p className="mt-0.5 font-semibold text-white/65">
                            {student.planDueDate
                              ? formatDate(student.planDueDate)
                              : "—"}
                          </p>
                        </div>
                        <div className="rounded-lg border border-white/[0.05] bg-black/20 px-3 py-2">
                          <p className="text-white/25 text-[10px]">Telefone</p>
                          <p className="mt-0.5 font-semibold text-white/65">
                            {student.phone || "—"}
                          </p>
                        </div>
                      </div>

                      {editingStudentId === student.id ? (
                        <div className="mt-4 rounded-xl border border-white/[0.07] bg-black/30 p-4">
                          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-[#b5f03c]/60">
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
                              className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-[#b5f03c]/40"
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
                              className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-[#b5f03c]/40"
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
                              className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-[#b5f03c]/40"
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
                              className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-[#b5f03c]/40"
                            />
                            <select
                              value={editStudentForm.alunoPlanId}
                              onChange={(e) =>
                                setEditStudentForm((prev) => ({
                                  ...prev,
                                  alunoPlanId: e.target.value,
                                }))
                              }
                              className="rounded-lg border border-white/[0.07] bg-[#111] px-3 py-2 text-sm text-white outline-none focus:border-[#b5f03c]/40"
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
                              className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-[#b5f03c]/40"
                            />
                          </div>
                          <div className="mt-3 flex items-center gap-2">
                            <label className="inline-flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-2 text-xs text-white/60">
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
                              className="rounded-lg bg-[#b5f03c] px-4 py-2 text-xs font-bold text-black transition hover:brightness-110"
                            >
                              Salvar
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingStudentId("")}
                              className="rounded-lg border border-white/[0.07] px-4 py-2 text-xs text-white/45 transition hover:text-white"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </article>
        </div>
      )}

      {/* TAB: PLANOS */}
      {activeTab === "planos" && (
        <div className="space-y-6">
          <article className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6">
            <h2 className="mb-5 text-sm font-bold text-white/60">
              Criar novo plano
            </h2>
            <form className="space-y-4" onSubmit={handleCreatePlan}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">
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
                    className="mt-2 w-full rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-2.5 text-sm font-normal text-white outline-none transition placeholder:text-white/20 focus:border-[#b5f03c]/40"
                    placeholder="Ex: Plano Premium"
                  />
                </label>
                <label className="block text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">
                  Preço mensal (R$)
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
                    className="mt-2 w-full rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-2.5 text-sm font-normal text-white outline-none transition placeholder:text-white/20 focus:border-[#b5f03c]/40"
                    placeholder="149.90"
                    step="0.01"
                    min="0"
                  />
                </label>
              </div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">
                Descrição
                <textarea
                  name="description"
                  value={newPlanForm.description}
                  onChange={(e) =>
                    setNewPlanForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-2.5 text-sm font-normal text-white outline-none transition placeholder:text-white/20 focus:border-[#b5f03c]/40"
                  placeholder="Descreva o plano..."
                  rows={3}
                />
              </label>
              <button
                type="submit"
                className="flex items-center gap-2 rounded-lg bg-[#b5f03c] px-5 py-2.5 text-xs font-bold uppercase tracking-[0.2em] text-black transition hover:brightness-110"
              >
                <Plus size={14} />
                Criar plano
              </button>
            </form>
          </article>

          <article className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6">
            <h2 className="mb-5 text-sm font-bold text-white/60">
              Planos de assinatura
              <span className="ml-2 rounded-md bg-white/[0.07] px-2 py-0.5 text-xs font-normal text-white/40">
                {plans.length}
              </span>
            </h2>
            <div className="space-y-2">
              {plans.length === 0 ? (
                <p className="rounded-lg border border-white/[0.07] px-4 py-6 text-center text-sm text-white/35">
                  Nenhum plano criado ainda.
                </p>
              ) : (
                plans.map((plan) => (
                  <div
                    key={plan.id}
                    className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-black/20 px-4 py-4 transition hover:bg-black/30 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {plan.name}
                      </p>
                      <p className="mt-0.5 text-xs text-white/40">
                        {plan.description || "Plano premium"}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-lg font-black text-[#b5f03c]">
                        {formatCurrency((plan.monthlyPriceCents || 0) / 100)}
                        <span className="text-xs font-normal text-white/35">
                          /mês
                        </span>
                      </p>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          className="rounded-lg border border-white/[0.07] p-1.5 text-white/35 transition hover:border-[#b5f03c]/30 hover:text-[#b5f03c]"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-white/[0.07] p-1.5 text-white/35 transition hover:border-red-400/30 hover:text-red-400"
                        >
                          <Trash2 size={13} />
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
      {activeTab === "comunicacao" && <ChatPanel students={students} />}
    </main>
  );
}

function ChatPanel({ students }) {
  const [selectedAluno, setSelectedAluno] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [workouts, setWorkouts] = useState([]);
  const [diets, setDiets] = useState([]);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState("");
  const [selectedDietId, setSelectedDietId] = useState("");
  const [sendingForward, setSendingForward] = useState(false);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);
  const selectedAlunoIdRef = useRef(null);
  const loadRequestSeqRef = useRef(0);

  const activeStudents = students.filter((s) => s.isActive !== false);

  const loadMessages = async (alunoId) => {
    const requestSeq = ++loadRequestSeqRef.current;
    setLoadingMsgs(true);
    try {
      const msgs = await listMessages(alunoId);
      if (
        selectedAlunoIdRef.current === alunoId &&
        requestSeq === loadRequestSeqRef.current
      ) {
        setMessages(msgs);
      }
    } catch {
      // keep existing
    } finally {
      if (
        selectedAlunoIdRef.current === alunoId &&
        requestSeq === loadRequestSeqRef.current
      ) {
        setLoadingMsgs(false);
      }
    }
  };

  const loadForwardOptions = async (alunoId) => {
    try {
      const [workoutsResult, dietsResult] = await Promise.all([
        listWorkoutPlans(alunoId),
        listDiets(undefined, { alunoId }),
      ]);
      setWorkouts(Array.isArray(workoutsResult) ? workoutsResult : []);
      setDiets(Array.isArray(dietsResult) ? dietsResult : []);
    } catch {
      setWorkouts([]);
      setDiets([]);
    }
  };

  const selectAluno = async (aluno) => {
    setSelectedAluno(aluno);
    selectedAlunoIdRef.current = aluno.id;
    setMessages([]);
    setText("");
    setSelectedWorkoutId("");
    setSelectedDietId("");
    clearInterval(pollRef.current);
    await Promise.all([loadMessages(aluno.id), loadForwardOptions(aluno.id)]);
    // Poll every 5s
    pollRef.current = setInterval(() => loadMessages(aluno.id), 5000);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => clearInterval(pollRef.current);
  }, []);

  const handleSend = async () => {
    if (!text.trim() || !selectedAluno || sending) return;
    setSending(true);
    const optimistic = {
      id: `opt-${Date.now()}`,
      senderRole: "PERSONAL",
      content: text.trim(),
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setText("");
    try {
      const msg = await sendMessage(selectedAluno.id, optimistic.content);
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? msg : m)),
      );
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  };

  const handleForward = async (kind) => {
    if (!selectedAluno || sendingForward) return;

    const sourceList = kind === "workout" ? workouts : diets;
    const selectedId = kind === "workout" ? selectedWorkoutId : selectedDietId;
    const item = sourceList.find((entry) => entry.id === selectedId);
    if (!item) return;

    setSendingForward(true);
    const optimistic = {
      id: `opt-fwd-${Date.now()}`,
      senderRole: "PERSONAL",
      content: buildForwardMessage(kind, item),
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const msg = await sendMessage(selectedAluno.id, optimistic.content);
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? msg : m)),
      );
      if (kind === "workout") {
        setSelectedWorkoutId("");
      } else {
        setSelectedDietId("");
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } finally {
      setSendingForward(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[480px] rounded-2xl border border-white/[0.07] overflow-hidden">
      {/* Sidebar — student list */}
      <aside
        className={`flex flex-col border-r border-white/[0.07] bg-[#0b0b0b] ${selectedAluno ? "hidden sm:flex w-60" : "flex w-full sm:w-60"}`}
      >
        <div className="px-4 py-4 border-b border-white/[0.07]">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">
            Conversas
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {activeStudents.length === 0 ? (
            <p className="px-4 py-6 text-xs text-white/30 text-center">
              Nenhum aluno ativo
            </p>
          ) : (
            activeStudents.map((aluno) => (
              <button
                key={aluno.id}
                type="button"
                onClick={() => selectAluno(aluno)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.04] ${
                  selectedAluno?.id === aluno.id
                    ? "bg-[#b5f03c]/[0.08] border-l-2 border-[#b5f03c]"
                    : "border-l-2 border-transparent"
                }`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#b5f03c]/15 text-[#b5f03c] text-xs font-bold">
                  {(aluno.fullName || "?")[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white/80">
                    {aluno.fullName}
                  </p>
                  <p className="truncate text-[10px] text-white/35">
                    {aluno.email || "sem e-mail"}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Chat area */}
      <div
        className={`flex flex-1 flex-col bg-[#080808] ${!selectedAluno ? "hidden sm:flex" : "flex"}`}
      >
        {!selectedAluno ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <MessageSquare size={32} className="text-white/10" />
            <p className="text-xs text-white/30">
              Selecione um aluno para iniciar uma conversa
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-white/[0.07] px-5 py-3">
              <button
                type="button"
                onClick={() => {
                  selectedAlunoIdRef.current = null;
                  setSelectedAluno(null);
                  clearInterval(pollRef.current);
                }}
                className="sm:hidden flex h-7 w-7 items-center justify-center rounded-full text-white/40 hover:text-white"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#b5f03c]/15 text-[#b5f03c] text-xs font-bold">
                {selectedAluno.fullName[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  {selectedAluno.fullName}
                </p>
                <p className="text-[10px] text-white/35">
                  {selectedAluno.email || ""}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {loadingMsgs && messages.length === 0 ? (
                <div className="flex justify-center py-8">
                  <Loader2 size={20} className="animate-spin text-white/20" />
                </div>
              ) : messages.length === 0 ? (
                <p className="text-center text-xs text-white/25 pt-10">
                  Nenhuma mensagem ainda. Inicie a conversa!
                </p>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderRole === "PERSONAL";
                  const forwarded = parseForwardMessage(msg.content);
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-6 ${
                          isMe
                            ? "bg-[#b5f03c] text-black rounded-br-sm"
                            : "bg-white/[0.07] text-white/85 rounded-bl-sm"
                        }`}
                      >
                        {forwarded ? (
                          <div>
                            <p
                              className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isMe ? "text-black/60" : "text-[#b5f03c]"}`}
                            >
                              {forwarded.kind === "workout"
                                ? "Treino encaminhado"
                                : "Dieta encaminhada"}
                            </p>
                            <p className="mt-1 font-semibold">
                              {forwarded.title || "Item"}
                            </p>
                            {forwarded.description ? (
                              <p
                                className={`mt-1 text-xs ${isMe ? "text-black/70" : "text-white/60"}`}
                              >
                                {forwarded.description}
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <p>{msg.content}</p>
                        )}
                        <p
                          className={`mt-1 text-[10px] ${isMe ? "text-black/50" : "text-white/30"}`}
                        >
                          {new Date(msg.createdAt).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-white/[0.07] px-4 py-3 space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <select
                    value={selectedWorkoutId}
                    onChange={(e) => setSelectedWorkoutId(e.target.value)}
                    className="flex-1 rounded-lg border border-white/[0.08] bg-[#111] px-3 py-2 text-xs text-white/70 outline-none focus:border-[#b5f03c]/40"
                  >
                    <option value="">Encaminhar treino...</option>
                    {workouts.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.title}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleForward("workout")}
                    disabled={!selectedWorkoutId || sendingForward}
                    className="rounded-lg border border-[#b5f03c]/30 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#b5f03c] transition hover:bg-[#b5f03c]/10 disabled:opacity-40"
                  >
                    Enviar
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedDietId}
                    onChange={(e) => setSelectedDietId(e.target.value)}
                    className="flex-1 rounded-lg border border-white/[0.08] bg-[#111] px-3 py-2 text-xs text-white/70 outline-none focus:border-[#b5f03c]/40"
                  >
                    <option value="">Encaminhar dieta...</option>
                    {diets.map((diet) => (
                      <option key={diet.id} value={diet.id}>
                        {diet.title}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleForward("diet")}
                    disabled={!selectedDietId || sendingForward}
                    className="rounded-lg border border-[#b5f03c]/30 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#b5f03c] transition hover:bg-[#b5f03c]/10 disabled:opacity-40"
                  >
                    Enviar
                  </button>
                </div>
              </div>

              <div className="flex items-end gap-3">
                <textarea
                  rows={1}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Digite uma mensagem..."
                  className="flex-1 resize-none rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm text-white placeholder-white/25 focus:border-[#b5f03c]/40 focus:outline-none"
                  style={{ maxHeight: 120 }}
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!text.trim() || sending}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#b5f03c] text-black transition hover:brightness-110 disabled:opacity-40"
                >
                  {sending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
