import { useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  Edit2,
  Trash2,
  Send,
  ChevronLeft,
} from "lucide-react";
import {
  createStudent,
  createStudentPlan,
  BILLING_INTERVAL_OPTIONS,
  formatCurrency,
  formatDate,
  getBillingIntervalSuffix,
  getPlanBillingIntervalMonths,
  isValidBillingIntervalMonths,
  listAgendaEvents,
  deleteAgendaEvent,
  deleteStudent,
  deleteMessage,
  listDiets,
  listStudentPlans,
  listStudents,
  listWorkoutPlanTemplates,
  listWorkoutPlans,
  deleteStudentPlan,
  updateStudent,
  updateStudentPlan,
  listMessages,
  sendMessage,
} from "../lib/api.js";
import { getBillingStatus } from "../lib/billingStatus.js";
import { localizeBillingStatus } from "../lib/billingStatusI18n.js";
import { useTenant } from "../contexts/TenantContext.jsx";
import { useI18n } from "../contexts/I18nContext.jsx";
import WorkoutBuilderPage from "./WorkoutBuilderPage.jsx";

function StatCard({ icon: Icon, label, value, sub, color = "#b5f03c" }) {
  return (
    <article
      className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-[#0f0f0f] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-white/12 hover:shadow-[0_20px_60px_rgba(0,0,0,0.5)] sm:rounded-2xl sm:p-6"
      style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04)` }}
    >
      {/* Top row: icon */}
      <div
        className="mb-3 inline-flex rounded-lg p-2 transition-all duration-300 group-hover:scale-110 sm:mb-4 sm:rounded-xl sm:p-2.5"
        style={{ background: `${color}15`, color }}
      >
        <Icon size={18} strokeWidth={2} />
      </div>
      {/* Value */}
      <p className="text-2xl font-black leading-none tracking-tight text-white sm:text-3xl">
        {value}
      </p>
      {/* Label */}
      <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.24em] text-white/30 sm:text-[10px] sm:tracking-[0.3em]">
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
      className={`relative flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] transition-all duration-200 sm:gap-2 sm:rounded-xl sm:px-4 sm:py-2.5 sm:text-[11px] sm:tracking-[0.2em] ${
        active
          ? "bg-[#b5f03c]/10 text-[#b5f03c] shadow-[inset_0_0_0_1px_rgba(181,240,60,0.25)]"
          : "text-white/30 hover:bg-white/[0.04] hover:text-white/60"
      }`}
    >
      {Icon && <Icon size={13} strokeWidth={2.5} />}
      <span>{label}</span>
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

const WEEKDAY_OPTIONS = [
  { value: "SUNDAY", label: "Domingo" },
  { value: "MONDAY", label: "Segunda" },
  { value: "TUESDAY", label: "Terca" },
  { value: "WEDNESDAY", label: "Quarta" },
  { value: "THURSDAY", label: "Quinta" },
  { value: "FRIDAY", label: "Sexta" },
  { value: "SATURDAY", label: "Sabado" },
];

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysInputValue(dateValue, days) {
  const date = dateValue ? new Date(`${dateValue}T00:00:00`) : new Date();
  if (Number.isNaN(date.getTime())) return todayInputValue();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function createWorkoutItem(seed = Date.now()) {
  return {
    id: `item-${seed}-${Math.random().toString(36).slice(2, 7)}`,
    exerciseName: "",
    sets: "",
    reps: "",
    restSeconds: "",
    notes: "",
  };
}

function createTrainingScheduleSlot(weekday = "MONDAY", time = "08:00") {
  const seed = Date.now();
  return {
    id: `slot-${seed}-${Math.random().toString(36).slice(2, 7)}`,
    weekday,
    time,
    mode: "template",
    templateId: "",
    title: "",
    objective: "",
    saveAsTemplate: false,
    items: [createWorkoutItem(seed)],
  };
}

function createTrainingScheduleDraft() {
  const startsOn = todayInputValue();
  return {
    startsOn,
    recurrenceUntil: "",
    durationMinutes: 60,
    days: [],
  };
}

const AGENDA_TIME_OPTIONS = [
  "06:00",
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
];

function dateToWeekdayValue(date) {
  return WEEKDAY_OPTIONS[date.getDay()]?.value || "MONDAY";
}

function eventToAgendaKey(event) {
  const date = new Date(event?.startsAt || event?.startAt || event?.start);
  if (Number.isNaN(date.getTime())) return "";
  const time = date.toTimeString().slice(0, 5);
  return `${dateToWeekdayValue(date)}-${time}`;
}

function normalizeApiFieldName(fieldName) {
  return String(fieldName || "").replace(/\[(\d+)\]/g, ".$1");
}

function extractApiFieldErrors(error) {
  const details = error?.details || {};
  const fields = details.fields || details.invalidFields || details.errors || [];
  const errors = {};

  if (Array.isArray(fields)) {
    fields.forEach((field) => {
      const name =
        typeof field === "string"
          ? field
          : field?.path || field?.field || field?.name || "";
      if (name) {
        errors[normalizeApiFieldName(name)] = true;
      }
    });
    return errors;
  }

  if (fields && typeof fields === "object") {
    Object.keys(fields).forEach((field) => {
      errors[normalizeApiFieldName(field)] = true;
    });
  }

  return errors;
}

export default function AdminDashboardPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { tenantId } = useTenant();
  const { t, locale } = useI18n();
  const [students, setStudents] = useState([]);
  const [plans, setPlans] = useState([]);
  const [workoutTemplates, setWorkoutTemplates] = useState([]);
  const [loadingWorkoutTemplates, setLoadingWorkoutTemplates] = useState(false);
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [occupiedAgenda, setOccupiedAgenda] = useState([]);
  const [loadingAgenda, setLoadingAgenda] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [studentFormErrors, setStudentFormErrors] = useState({});
  const [activeTab, setActiveTab] = useState("visao-geral");
  const [editingStudentId, setEditingStudentId] = useState("");
  const [deletingStudentId, setDeletingStudentId] = useState("");
  const [editingPlanId, setEditingPlanId] = useState("");
  const [deletingPlanId, setDeletingPlanId] = useState("");
  const [editStudentForm, setEditStudentForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    birthDate: "",
    alunoPlanId: "",
    planDueDate: "",
    isActive: true,
    password: "",
    confirmPassword: "",
  });

  // Form states for creating/editing
  const [newStudentForm, setNewStudentForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    birthDate: "",
    alunoPlanId: "",
    planDueDate: "",
    trainingSchedule: createTrainingScheduleDraft(),
  });
  const [newPlanForm, setNewPlanForm] = useState({
    name: "",
    description: "",
    monthlyPriceCents: 0,
    billingIntervalMonths: 1,
    isActive: true,
  });

  const fieldClass = (fieldName, className) =>
    `${className} ${
      studentFormErrors[fieldName]
        ? "border-red-400/70 focus:border-red-400"
        : ""
    }`;

  const updateTrainingSchedule = (changes) => {
    setNewStudentForm((prev) => ({
      ...prev,
      trainingSchedule: { ...prev.trainingSchedule, ...changes },
    }));
  };

  const updateTrainingSlot = (slotId, changes) => {
    setNewStudentForm((prev) => ({
      ...prev,
      trainingSchedule: {
        ...prev.trainingSchedule,
        days: prev.trainingSchedule.days.map((slot) =>
          slot.id === slotId ? { ...slot, ...changes } : slot,
        ),
      },
    }));
  };

  const updateTrainingSlotItem = (slotId, itemId, changes) => {
    setNewStudentForm((prev) => ({
      ...prev,
      trainingSchedule: {
        ...prev.trainingSchedule,
        days: prev.trainingSchedule.days.map((slot) =>
          slot.id === slotId
            ? {
                ...slot,
                items: slot.items.map((item) =>
                  item.id === itemId ? { ...item, ...changes } : item,
                ),
              }
            : slot,
        ),
      },
    }));
  };

  const addTrainingSlot = (weekday = "MONDAY", time = "08:00") => {
    const key = `${weekday}-${time}`;
    const alreadySelected = newStudentForm.trainingSchedule.days.some(
      (slot) => `${slot.weekday}-${slot.time}` === key,
    );
    const occupied = occupiedAgenda.some((slot) => slot.key === key);

    if (alreadySelected || occupied) {
      setMessage(
        occupied
          ? "Horário ocupado na agenda. Escolha outro slot."
          : "Esse horário já foi selecionado.",
      );
      return;
    }

    setNewStudentForm((prev) => ({
      ...prev,
      trainingSchedule: {
        ...prev.trainingSchedule,
        recurrenceUntil:
          prev.trainingSchedule.recurrenceUntil ||
          addDaysInputValue(prev.trainingSchedule.startsOn, 28),
        days: [
          ...prev.trainingSchedule.days,
          createTrainingScheduleSlot(weekday, time),
        ],
      },
    }));
  };

  const removeTrainingSlot = (slotId) => {
    setNewStudentForm((prev) => ({
      ...prev,
      trainingSchedule: {
        ...prev.trainingSchedule,
        days: prev.trainingSchedule.days.filter((slot) => slot.id !== slotId),
      },
    }));
  };

  const addTrainingSlotItem = (slotId) => {
    setNewStudentForm((prev) => ({
      ...prev,
      trainingSchedule: {
        ...prev.trainingSchedule,
        days: prev.trainingSchedule.days.map((slot) =>
          slot.id === slotId
            ? { ...slot, items: [...slot.items, createWorkoutItem()] }
            : slot,
        ),
      },
    }));
  };

  const removeTrainingSlotItem = (slotId, itemId) => {
    setNewStudentForm((prev) => ({
      ...prev,
      trainingSchedule: {
        ...prev.trainingSchedule,
        days: prev.trainingSchedule.days.map((slot) =>
          slot.id === slotId
            ? {
                ...slot,
                items: slot.items.filter((item) => item.id !== itemId),
              }
            : slot,
        ),
      },
    }));
  };

  const loadWorkoutTemplates = async () => {
    if (!tenantId) return [];
    setLoadingWorkoutTemplates(true);
    try {
      const templates = await listWorkoutPlanTemplates(tenantId);
      const items = Array.isArray(templates) ? templates : [];
      setWorkoutTemplates(items);
      return items;
    } catch (error) {
      setMessage(error?.message || "Não foi possível carregar templates de treino");
      return [];
    } finally {
      setLoadingWorkoutTemplates(false);
    }
  };

  const loadOccupiedAgenda = async () => {
    if (!tenantId) return [];
    const from = newStudentForm.trainingSchedule.startsOn || todayInputValue();
    const to =
      newStudentForm.trainingSchedule.recurrenceUntil ||
      addDaysInputValue(from, 28);

    setLoadingAgenda(true);
    try {
      const events = await listAgendaEvents(tenantId, { from, to });
      const occupied = (Array.isArray(events) ? events : [])
        .map((event) => ({
          key: eventToAgendaKey(event),
          title: event?.title || event?.aluno?.fullName || "Ocupado",
        }))
        .filter((event) => event.key);
      setOccupiedAgenda(occupied);
      return occupied;
    } catch (error) {
      setMessage(error?.message || "Não foi possível carregar a agenda ocupada");
      return [];
    } finally {
      setLoadingAgenda(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const [studentsResult, plansResult, templatesResult] = await Promise.all([
          listStudents(tenantId),
          listStudentPlans(tenantId),
          listWorkoutPlanTemplates(tenantId).catch(() => []),
        ]);

        if (!cancelled) {
          setStudents(Array.isArray(studentsResult) ? studentsResult : []);
          setPlans(Array.isArray(plansResult) ? plansResult : []);
          setWorkoutTemplates(
            Array.isArray(templatesResult) ? templatesResult : [],
          );
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(
            error?.message ||
              t(
                "ADMIN_DASH_LOAD_ERROR_THIAGOIAZZETTI",
                "Não foi possível carregar o painel",
              ),
          );
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
    const activeStudents = students.filter((s) => s.isActive !== false).length;
    const inactiveStudents = students.filter((s) => {
      const lastActivity = new Date(s.updatedAt || 0);
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      return lastActivity < fiveDaysAgo;
    }).length;

    return [
      {
        icon: Users,
        label: t(
          "ADMIN_DASH_STAT_ACTIVE_STUDENTS_THIAGOIAZZETTI",
          "Alunos ativos",
        ),
        value: activeStudents,
        color: "#b5f03c",
      },
      {
        icon: Wallet,
        label: t("ADMIN_DASH_STAT_PLANS_THIAGOIAZZETTI", "Planos"),
        value: activePlans,
        color: "#60a5fa",
      },
      {
        icon: TrendingUp,
        label: t(
          "ADMIN_DASH_STAT_INACTIVE_THIAGOIAZZETTI",
          "Inativos (5+ dias)",
        ),
        value: inactiveStudents,
        color: "#f87171",
      },
      {
        icon: Dumbbell,
        label: t(
          "ADMIN_DASH_STAT_POTENTIAL_THIAGOIAZZETTI",
          "Potencial mensal",
        ),
        value: formatCurrency(
          plans.reduce((sum, p) => sum + (p.monthlyPriceCents || 0), 0) / 100,
        ),
        color: "#4ade80",
      },
    ];
  }, [plans, students, t]);

  const validateTrainingSchedule = () => {
    const errors = {};
    const schedule = newStudentForm.trainingSchedule;

    if (schedule.days.length === 0) {
      return errors;
    }

    if (!schedule.startsOn) {
      errors["trainingSchedule.startsOn"] = true;
    }
    if (!schedule.recurrenceUntil) {
      errors["trainingSchedule.recurrenceUntil"] = true;
    }
    if (!Number(schedule.durationMinutes)) {
      errors["trainingSchedule.durationMinutes"] = true;
    }

    schedule.days.forEach((slot, slotIndex) => {
      const prefix = `trainingSchedule.days.${slotIndex}`;

      if (!slot.weekday) {
        errors[`${prefix}.weekday`] = true;
      }
      if (!slot.time) {
        errors[`${prefix}.time`] = true;
      }
      if (occupiedAgenda.some((occupied) => occupied.key === `${slot.weekday}-${slot.time}`)) {
        errors[`${prefix}.time`] = true;
      }
      if (slot.mode === "template" && !slot.templateId) {
        errors[`${prefix}.templateId`] = true;
      }
      if (slot.mode === "custom" && !slot.title.trim()) {
        errors[`${prefix}.title`] = true;
      }

      if (slot.mode === "custom") {
        slot.items.forEach((item, itemIndex) => {
          if (!item.exerciseName.trim()) {
            errors[`${prefix}.items.${itemIndex}.exerciseName`] = true;
          }
          if (!Number(item.sets)) {
            errors[`${prefix}.items.${itemIndex}.sets`] = true;
          }
          if (!String(item.reps || "").trim()) {
            errors[`${prefix}.items.${itemIndex}.reps`] = true;
          }
        });
      }
    });

    return errors;
  };

  const buildTrainingSchedulePayload = () => {
    const schedule = newStudentForm.trainingSchedule;
    if (schedule.days.length === 0) return undefined;

    return {
      startsOn: schedule.startsOn,
      recurrenceUntil: schedule.recurrenceUntil,
      durationMinutes: Number(schedule.durationMinutes) || 60,
      days: schedule.days.map((slot) => {
        if (slot.mode === "template") {
          return {
            weekday: slot.weekday,
            time: slot.time,
            templateId: slot.templateId,
          };
        }

        return {
          weekday: slot.weekday,
          time: slot.time,
          title: slot.title.trim(),
          objective: slot.objective.trim(),
          saveAsTemplate: Boolean(slot.saveAsTemplate),
          items: slot.items.map((item) => ({
            exerciseName: item.exerciseName.trim(),
            sets: Number(item.sets),
            reps: String(item.reps).trim(),
            restSeconds: item.restSeconds ? Number(item.restSeconds) : null,
            notes: item.notes || "",
          })),
        };
      }),
    };
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    const nextErrors = {};

    if (!newStudentForm.fullName.trim()) {
      nextErrors.fullName = true;
    }
    if (!newStudentForm.email.trim()) {
      nextErrors.email = true;
    }

    Object.assign(nextErrors, validateTrainingSchedule());

    if (Object.keys(nextErrors).length > 0) {
      setStudentFormErrors(nextErrors);
      setMessage(
        Object.keys(nextErrors).some((field) =>
          field.startsWith("trainingSchedule"),
        )
          ? "Revise os campos destacados em treinos e horários."
          : t(
              "ADMIN_DASH_STUDENT_REQUIRED_THIAGOIAZZETTI",
              "Nome e email sao obrigatorios",
            ),
      );
      return;
    }

    setStudentFormErrors({});

    try {
      if (workoutTemplates.length === 0) {
        await loadWorkoutTemplates();
      }

      const trainingSchedule = buildTrainingSchedulePayload();
      const created = await createStudent(
        {
          fullName: newStudentForm.fullName,
          email: newStudentForm.email,
          phone: newStudentForm.phone,
          birthDate: newStudentForm.birthDate || null,
          alunoPlanId: newStudentForm.alunoPlanId || null,
          planDueDate: newStudentForm.planDueDate || null,
          isActive: true,
          ...(trainingSchedule ? { trainingSchedule } : {}),
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
        trainingSchedule: createTrainingScheduleDraft(),
      });
      setAgendaOpen(false);
      setOccupiedAgenda([]);
      setMessage(
        `${t("ADMIN_DASH_STUDENT_CREATED_THIAGOIAZZETTI", "Aluno criado com sucesso")}: ${created.fullName}`,
      );
    } catch (error) {
      if (error?.status === 409) {
        setMessage("Conflito de agenda: já existe treino no horário escolhido.");
        return;
      }

      if (error?.status === 400) {
        const apiFieldErrors = extractApiFieldErrors(error);
        setStudentFormErrors((current) => ({
          ...current,
          fullName: !newStudentForm.fullName.trim(),
          email: !newStudentForm.email.trim(),
          ...validateTrainingSchedule(),
          ...apiFieldErrors,
        }));
        setMessage(
          error?.message ||
            "Revise os campos destacados antes de criar o aluno.",
        );
        return;
      }

      setMessage(
        error?.message ||
          t(
            "ADMIN_DASH_STUDENT_CREATE_ERROR_THIAGOIAZZETTI",
            "Não foi possível criar o aluno",
          ),
      );
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
      password: "",
      confirmPassword: "",
    });
  };

  const handleSaveStudent = async (studentId) => {
    try {
      const password = editStudentForm.password.trim();
      const confirmPassword = editStudentForm.confirmPassword.trim();

      if (password && password.length < 6) {
        setMessage("A nova senha deve ter pelo menos 6 caracteres.");
        return;
      }

      if (password && password !== confirmPassword) {
        setMessage("A confirmação da nova senha não confere.");
        return;
      }

      const currentStudent = students.find((item) => item.id === studentId);
      const wasActive = currentStudent?.isActive !== false;
      const willBeActive = Boolean(editStudentForm.isActive);
      const isDeactivating = wasActive && !willBeActive;
      const payload = {
        fullName: editStudentForm.fullName,
        email: editStudentForm.email || null,
        phone: editStudentForm.phone || null,
        birthDate: editStudentForm.birthDate || null,
        alunoPlanId: editStudentForm.alunoPlanId || null,
        planDueDate: isDeactivating ? null : editStudentForm.planDueDate || null,
        isActive: willBeActive,
        cancelRecurringSubscription: isDeactivating,
        disableRecurringPayment: isDeactivating,
        releaseScheduledEvents: isDeactivating,
        clearScheduledWorkouts: isDeactivating,
      };

      if (password) {
        payload.password = password;
      }

      const updated = await updateStudent(
        studentId,
        payload,
        tenantId,
      );

      if (isDeactivating) {
        const events = await listAgendaEvents(tenantId, { alunoId: studentId });
        const deletions = (Array.isArray(events) ? events : [])
          .filter((event) => event?.id)
          .map((event) => deleteAgendaEvent(event.id, tenantId));

        await Promise.all(deletions);
      }

      setStudents((current) =>
        current.map((item) =>
          item.id === studentId
            ? {
                ...updated,
                planDueDate: isDeactivating ? null : updated.planDueDate,
              }
            : item,
        ),
      );
      setEditingStudentId("");
      setEditStudentForm((current) => ({
        ...current,
        password: "",
        confirmPassword: "",
      }));
      setMessage(
        isDeactivating
          ? `${updated.fullName} foi inativado. Horários liberados e recorrência desligada.`
          : `${t("ADMIN_DASH_STUDENT_UPDATED_THIAGOIAZZETTI", "Aluno atualizado")}: ${updated.fullName}`,
      );
    } catch (error) {
      if (error?.message === "Aluno does not have a linked login user") {
        setMessage("Este aluno ainda não possui acesso de login vinculado.");
        return;
      }

      setMessage(
        error?.message ||
          t(
            "ADMIN_DASH_STUDENT_UPDATE_ERROR_THIAGOIAZZETTI",
            "Não foi possível atualizar o aluno",
          ),
      );
    }
  };

  const handleDeleteStudent = async (student) => {
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir o aluno "${student.fullName}"? Essa ação apaga o aluno do banco de dados e não pode ser desfeita.`,
    );

    if (!confirmed) return;

    setDeletingStudentId(student.id);
    try {
      await deleteStudent(student.id, tenantId);
      setStudents((current) => current.filter((item) => item.id !== student.id));
      if (editingStudentId === student.id) {
        setEditingStudentId("");
      }
      setMessage(`${student.fullName} foi excluido do banco de dados.`);
    } catch (error) {
      setMessage(
        error?.status === 404
          ? "A rota DELETE /alunos/:id ainda não existe no backend. Use o prompt gerado em docs/backend-delete-student-prompt.md para implementar."
          : error?.message || "Não foi possível excluir o aluno.",
      );
    } finally {
      setDeletingStudentId("");
    }
  };

  const resetPlanForm = () => {
    setEditingPlanId("");
    setNewPlanForm({
      name: "",
      description: "",
      monthlyPriceCents: 0,
      billingIntervalMonths: 1,
      isActive: true,
    });
  };

  const startEditPlan = (plan) => {
    setEditingPlanId(plan.id);
    setNewPlanForm({
      name: plan.name || "",
      description: plan.description || "",
      monthlyPriceCents: Number(plan.monthlyPriceCents || 0),
      billingIntervalMonths: getPlanBillingIntervalMonths(plan),
      isActive: plan.isActive !== false,
    });
    setMessage(`Editando plano: ${plan.name}`);
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    if (!newPlanForm.name.trim()) {
      setMessage(
        t(
          "ADMIN_DASH_PLAN_NAME_REQUIRED_THIAGOIAZZETTI",
          "Nome do plano e obrigatorio",
        ),
      );
      return;
    }

    if (!isValidBillingIntervalMonths(newPlanForm.billingIntervalMonths)) {
      setMessage("Escolha uma recorrência de cobrança válida.");
      return;
    }

    if (Number(newPlanForm.monthlyPriceCents) <= 0) {
      setMessage("Informe um valor de cobrança válido.");
      return;
    }

    try {
      if (editingPlanId) {
        const updated = await updateStudentPlan(
          editingPlanId,
          newPlanForm,
          tenantId,
        );
        setPlans((current) =>
          current.map((plan) => (plan.id === editingPlanId ? updated : plan)),
        );
        resetPlanForm();
        setMessage(`Plano atualizado com sucesso: ${updated.name}`);
      } else {
        const created = await createStudentPlan(newPlanForm, tenantId);
        setPlans((current) => [created, ...current]);
        resetPlanForm();
        setMessage(
          `${t("ADMIN_DASH_PLAN_CREATED_THIAGOIAZZETTI", "Plano criado com sucesso")}: ${created.name}`,
        );
      }
    } catch (error) {
      setMessage(
        error?.message ||
          t(
            "ADMIN_DASH_PLAN_CREATE_ERROR_THIAGOIAZZETTI",
            "Não foi possível criar o plano",
          ),
      );
    }
  };

  const handleDeletePlan = async (plan) => {
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir o plano "${plan.name}"?`,
    );

    if (!confirmed) return;

    setDeletingPlanId(plan.id);
    try {
      await deleteStudentPlan(plan.id, tenantId);
      setPlans((current) => current.filter((item) => item.id !== plan.id));
      if (editingPlanId === plan.id) {
        resetPlanForm();
      }
      setMessage(`Plano excluído com sucesso: ${plan.name}`);
    } catch (error) {
      setMessage(error?.message || "Não foi possível excluir o plano.");
    } finally {
      setDeletingPlanId("");
    }
  };

  return (
    <main className="space-y-4 pb-10 sm:space-y-6 sm:pb-12">
      {/* Header */}
      <section className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[8px] font-bold uppercase tracking-[0.35em] text-white/20 sm:text-[9px] sm:tracking-[0.45em]">
            {t("ADMIN_DASH_HEADER_LABEL_THIAGOIAZZETTI", "Painel")}
          </p>
          <h1 className="mt-1 text-xl font-black leading-tight tracking-tight text-white sm:text-2xl">
            {t("ADMIN_DASH_HEADER_TITLE_THIAGOIAZZETTI", "Visão Geral")}
          </h1>
        </div>
        {loading && (
          <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5">
            <Loader2 className="animate-spin text-[#b5f03c]/60" size={13} />
            <span className="text-[10px] text-white/30">
              {t("ADMIN_DASH_LOADING_THIAGOIAZZETTI", "Carregando...")}
            </span>
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
      <div className="-mx-3 overflow-x-auto px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
        <div className="flex min-w-max items-center gap-1 rounded-xl border border-white/[0.06] bg-[#0d0d0d] p-1 sm:rounded-2xl sm:p-1.5">
        <TabButton
          active={activeTab === "visao-geral"}
          icon={BarChart3}
          label={t("ADMIN_TAB_OVERVIEW_THIAGOIAZZETTI", "Visão Geral")}
          onClick={() => setActiveTab("visao-geral")}
        />
        <TabButton
          active={activeTab === "alunos"}
          icon={Users}
          label={t("ADMIN_TAB_STUDENTS_THIAGOIAZZETTI", "Alunos")}
          onClick={() => setActiveTab("alunos")}
        />
        <TabButton
          active={activeTab === "planos"}
          icon={Wallet}
          label={t("ADMIN_TAB_PLANS_THIAGOIAZZETTI", "Planos")}
          onClick={() => setActiveTab("planos")}
        />
        <TabButton
          active={activeTab === "treinos"}
          icon={Dumbbell}
          label={t("ADMIN_TAB_WORKOUTS_THIAGOIAZZETTI", "Treinos")}
          onClick={() => setActiveTab("treinos")}
        />
        <TabButton
          active={activeTab === "comunicacao"}
          icon={MessageSquare}
          label={t("ADMIN_TAB_COMMUNICATION_THIAGOIAZZETTI", "Comunicação")}
          onClick={() => setActiveTab("comunicacao")}
        />
        </div>
      </div>

      {/* TAB: VISAO GERAL */}
      {activeTab === "visao-geral" && (
        <div className="space-y-4 sm:space-y-6">
          <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
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
                <article className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4 sm:rounded-2xl sm:p-5">
                  <p className="mb-4 text-[9px] font-bold uppercase tracking-[0.24em] text-white/30 sm:text-[10px] sm:tracking-[0.32em]">
                    {t(
                      "ADMIN_DASH_PAYMENT_STATUS_THIAGOIAZZETTI",
                      "Status de Pagamento",
                    )}
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
                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-white/50 sm:gap-5 sm:text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      {paid} {t("ADMIN_DASH_PAID_THIAGOIAZZETTI", "pagos")}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-400" />
                      {pending}{" "}
                      {t("ADMIN_DASH_PENDING_THIAGOIAZZETTI", "pendentes")}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-red-400" />
                      {overdue}{" "}
                      {t("ADMIN_DASH_OVERDUE_THIAGOIAZZETTI", "atrasados")}
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
                  {t(
                    "ADMIN_DASH_INACTIVE_STUDENTS_THIAGOIAZZETTI",
                    "Alunos inativos",
                  )}
                </p>
                <AlertCircle className="text-red-400/60" size={15} />
              </div>
              <div className="space-y-2">
                {students.filter((s) => {
                  const lastActivity = new Date(s.updatedAt || 0);
                  const fiveDaysAgo = new Date(
                    Date.now() - 5 * 24 * 60 * 60 * 1000,
                  );
                  return lastActivity < fiveDaysAgo;
                }).length === 0 ? (
                  <p className="text-xs text-white/40">
                    {t(
                      "ADMIN_DASH_NO_INACTIVE_THIAGOIAZZETTI",
                      "Nenhum aluno inativo. Perfeito!",
                    )}
                  </p>
                ) : (
                  students
                    .filter((s) => {
                      const lastActivity = new Date(s.updatedAt || 0);
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
                          {t(
                            "ADMIN_DASH_INACTIVE_LABEL_THIAGOIAZZETTI",
                            "Inativo",
                          )}
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
                  {t("ADMIN_DASH_BIRTHDAYS_THIAGOIAZZETTI", "Aniversariantes")}
                </p>
                <Calendar className="text-[#b5f03c]/50" size={15} />
              </div>
              <p className="text-xs text-white/40">
                {t(
                  "ADMIN_DASH_NO_BIRTHDAYS_THIAGOIAZZETTI",
                  "Nenhum aniversário próximo nos próximos 7 dias.",
                )}
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
              {t(
                "ADMIN_DASH_CREATE_STUDENT_THIAGOIAZZETTI",
                "Cadastrar novo aluno",
              )}
            </h2>
            <form className="space-y-4" onSubmit={handleCreateStudent}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">
                  {t("ADMIN_DASH_FULL_NAME_THIAGOIAZZETTI", "Nome completo")}
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
                    className={fieldClass(
                      "fullName",
                      "mt-2 w-full rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-2.5 text-sm font-normal text-white outline-none transition placeholder:text-white/20 focus:border-[#b5f03c]/40",
                    )}
                    placeholder={t(
                      "ADMIN_DASH_NAME_PLACEHOLDER_THIAGOIAZZETTI",
                      "Ex: Joao Silva",
                    )}
                  />
                </label>
                <label className="block text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">
                  {t("ADMIN_DASH_EMAIL_THIAGOIAZZETTI", "Email")}
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
                    className={fieldClass(
                      "email",
                      "mt-2 w-full rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-2.5 text-sm font-normal text-white outline-none transition placeholder:text-white/20 focus:border-[#b5f03c]/40",
                    )}
                    placeholder="joao@email.com"
                  />
                </label>
                <label className="block text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">
                  {t("ADMIN_DASH_PHONE_THIAGOIAZZETTI", "Telefone")}
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
                  {t(
                    "ADMIN_DASH_BIRTHDATE_THIAGOIAZZETTI",
                    "Data de nascimento",
                  )}
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
                  {t(
                    "ADMIN_DASH_PLAN_DUE_DATE_THIAGOIAZZETTI",
                    "Vencimento do plano",
                  )}
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
                  {t(
                    "ADMIN_DASH_STUDENT_PLAN_THIAGOIAZZETTI",
                    "Plano do aluno",
                  )}
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
                    <option value="">
                      {t("ADMIN_DASH_NO_PLAN_THIAGOIAZZETTI", "Sem plano")}
                    </option>
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} —{" "}
                        {formatCurrency((plan.monthlyPriceCents || 0) / 100)}{" "}
                        {getBillingIntervalSuffix(plan)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <section className="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#b5f03c]">
                      Agenda de treinos
                    </h3>
                    <p className="mt-1 text-xs text-white/45">
                      Selecione slots livres e vincule cada horário a um template ou treino simples.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAgendaOpen((current) => !current);
                      if (!agendaOpen) {
                        loadWorkoutTemplates();
                        loadOccupiedAgenda();
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#b5f03c]/50 bg-[#b5f03c]/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#b5f03c] transition hover:bg-[#b5f03c]/20"
                  >
                    <Calendar size={14} />
                    {agendaOpen ? "Ocultar agenda" : "Abrir agenda"}
                  </button>
                </div>

                {agendaOpen ? (
                  <div className="mt-4 space-y-4">
                    <div className="grid gap-3 md:grid-cols-3">
                      <label className="block text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">
                        Início
                        <input
                          type="date"
                          value={newStudentForm.trainingSchedule.startsOn}
                          onChange={(event) =>
                            updateTrainingSchedule({ startsOn: event.target.value })
                          }
                          className={fieldClass(
                            "trainingSchedule.startsOn",
                            "mt-2 w-full rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-2.5 text-sm font-normal text-white outline-none transition focus:border-[#b5f03c]/40",
                          )}
                        />
                      </label>
                      <label className="block text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">
                        Recorrência até
                        <input
                          type="date"
                          value={newStudentForm.trainingSchedule.recurrenceUntil}
                          onChange={(event) =>
                            updateTrainingSchedule({
                              recurrenceUntil: event.target.value,
                            })
                          }
                          className={fieldClass(
                            "trainingSchedule.recurrenceUntil",
                            "mt-2 w-full rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-2.5 text-sm font-normal text-white outline-none transition focus:border-[#b5f03c]/40",
                          )}
                        />
                      </label>
                      <label className="block text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">
                        Duração
                        <input
                          type="number"
                          min="1"
                          value={newStudentForm.trainingSchedule.durationMinutes}
                          onChange={(event) =>
                            updateTrainingSchedule({
                              durationMinutes: event.target.value,
                            })
                          }
                          className={fieldClass(
                            "trainingSchedule.durationMinutes",
                            "mt-2 w-full rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-2.5 text-sm font-normal text-white outline-none transition focus:border-[#b5f03c]/40",
                          )}
                        />
                      </label>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-white/[0.07]">
                      <div className="min-w-[760px]">
                        <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-white/[0.07] bg-white/[0.03]">
                          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
                            Hora
                          </div>
                          {WEEKDAY_OPTIONS.map((day) => (
                            <div
                              key={day.value}
                              className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-white/35"
                            >
                              {day.label.slice(0, 3)}
                            </div>
                          ))}
                        </div>
                        {AGENDA_TIME_OPTIONS.map((time) => (
                          <div
                            key={time}
                            className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-white/[0.05] last:border-b-0"
                          >
                            <div className="px-3 py-2 text-xs font-semibold text-white/45">
                              {time}
                            </div>
                            {WEEKDAY_OPTIONS.map((day) => {
                              const key = `${day.value}-${time}`;
                              const occupied = occupiedAgenda.some(
                                (slot) => slot.key === key,
                              );
                              const selected =
                                newStudentForm.trainingSchedule.days.some(
                                  (slot) =>
                                    `${slot.weekday}-${slot.time}` === key,
                                );
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  disabled={occupied || loadingAgenda}
                                  onClick={() => addTrainingSlot(day.value, time)}
                                  className={`m-1 min-h-9 rounded-lg border px-2 text-[11px] font-semibold transition ${
                                    occupied
                                      ? "cursor-not-allowed border-red-400/30 bg-red-500/10 text-red-200/60"
                                      : selected
                                        ? "border-[#b5f03c]/60 bg-[#b5f03c]/15 text-[#b5f03c]"
                                        : "border-white/[0.07] bg-white/[0.03] text-white/45 hover:border-[#b5f03c]/35 hover:text-white"
                                  }`}
                                  title={occupied ? "Horário ocupado" : "Selecionar horário"}
                                >
                                  {occupied ? "Ocupado" : selected ? "Selecionado" : "Livre"}
                                </button>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={loadOccupiedAgenda}
                        disabled={loadingAgenda}
                        className="rounded-lg border border-white/[0.07] px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white/55 transition hover:border-white/20 disabled:opacity-50"
                      >
                        {loadingAgenda ? "Carregando..." : "Atualizar agenda"}
                      </button>
                      <button
                        type="button"
                        onClick={loadWorkoutTemplates}
                        disabled={loadingWorkoutTemplates}
                        className="rounded-lg border border-white/[0.07] px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white/55 transition hover:border-white/20 disabled:opacity-50"
                      >
                        {loadingWorkoutTemplates ? "Carregando..." : "Atualizar templates"}
                      </button>
                    </div>

                    {newStudentForm.trainingSchedule.days.length === 0 ? (
                      <p className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-sm text-white/45">
                        Nenhum horário selecionado.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {newStudentForm.trainingSchedule.days.map((slot, slotIndex) => {
                          const prefix = `trainingSchedule.days.${slotIndex}`;
                          const weekdayLabel =
                            WEEKDAY_OPTIONS.find((day) => day.value === slot.weekday)
                              ?.label || slot.weekday;

                          return (
                            <div
                              key={slot.id}
                              className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-bold text-white/75">
                                    {weekdayLabel} as {slot.time}
                                  </p>
                                  <p className="mt-1 text-xs text-white/35">
                                    Configure o treino deste slot.
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeTrainingSlot(slot.id)}
                                  className="rounded-lg border border-white/[0.07] p-2 text-white/45 transition hover:text-red-300"
                                  title="Remover horário"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>

                              <div className="mt-4 grid gap-3 md:grid-cols-2">
                                <label className="block text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">
                                  Tipo
                                  <select
                                    value={slot.mode}
                                    onChange={(event) =>
                                      updateTrainingSlot(slot.id, {
                                        mode: event.target.value,
                                      })
                                    }
                                    className="mt-2 w-full rounded-lg border border-white/[0.07] bg-[#111] px-3 py-2.5 text-sm font-normal text-white outline-none transition focus:border-[#b5f03c]/40"
                                  >
                                    <option value="template">
                                      Usar template existente
                                    </option>
                                    <option value="custom">Criar treino novo</option>
                                  </select>
                                </label>

                                {slot.mode === "template" ? (
                                  <label className="block text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">
                                    Template
                                    <select
                                      value={slot.templateId}
                                      onChange={(event) =>
                                        updateTrainingSlot(slot.id, {
                                          templateId: event.target.value,
                                        })
                                      }
                                      className={fieldClass(
                                        `${prefix}.templateId`,
                                        "mt-2 w-full rounded-lg border border-white/[0.07] bg-[#111] px-3 py-2.5 text-sm font-normal text-white outline-none transition focus:border-[#b5f03c]/40",
                                      )}
                                    >
                                      <option value="">Selecione um template</option>
                                      {workoutTemplates.map((template) => (
                                        <option key={template.id} value={template.id}>
                                          {template.title ||
                                            template.name ||
                                            "Template"}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                ) : (
                                  <>
                                    <label className="block text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">
                                      Título
                                      <input
                                        type="text"
                                        value={slot.title}
                                        onChange={(event) =>
                                          updateTrainingSlot(slot.id, {
                                            title: event.target.value,
                                          })
                                        }
                                        className={fieldClass(
                                          `${prefix}.title`,
                                          "mt-2 w-full rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-2.5 text-sm font-normal text-white outline-none transition placeholder:text-white/20 focus:border-[#b5f03c]/40",
                                        )}
                                        placeholder="Ex: Treino novo"
                                      />
                                    </label>
                                    <label className="block text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">
                                      Objetivo
                                      <input
                                        type="text"
                                        value={slot.objective}
                                        onChange={(event) =>
                                          updateTrainingSlot(slot.id, {
                                            objective: event.target.value,
                                          })
                                        }
                                        className="mt-2 w-full rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-2.5 text-sm font-normal text-white outline-none transition placeholder:text-white/20 focus:border-[#b5f03c]/40"
                                        placeholder="Ex: Hipertrofia"
                                      />
                                    </label>
                                    <label className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-black/20 px-3 py-3 text-sm text-white/65 md:col-span-2">
                                      <input
                                        type="checkbox"
                                        checked={slot.saveAsTemplate}
                                        onChange={(event) =>
                                          updateTrainingSlot(slot.id, {
                                            saveAsTemplate: event.target.checked,
                                          })
                                        }
                                      />
                                      Salvar esse treino na biblioteca
                                    </label>
                                  </>
                                )}
                              </div>

                              {slot.mode === "custom" ? (
                                <div className="mt-4 space-y-3">
                                  <div className="flex items-center justify-between gap-3">
                                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">
                                      Exercicios
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => addTrainingSlotItem(slot.id)}
                                      className="rounded-lg border border-white/[0.07] px-3 py-2 text-xs font-semibold text-white/55 transition hover:border-white/20"
                                    >
                                      Adicionar exercicio
                                    </button>
                                  </div>
                                  {slot.items.map((item, itemIndex) => (
                                    <div
                                      key={item.id}
                                      className="grid gap-3 rounded-xl border border-white/[0.07] bg-black/20 p-3 md:grid-cols-[2fr_1fr_1fr_1fr_auto]"
                                    >
                                      <input
                                        type="text"
                                        value={item.exerciseName}
                                        onChange={(event) =>
                                          updateTrainingSlotItem(
                                            slot.id,
                                            item.id,
                                            { exerciseName: event.target.value },
                                          )
                                        }
                                        className={fieldClass(
                                          `${prefix}.items.${itemIndex}.exerciseName`,
                                          "rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-2.5 text-sm font-normal text-white outline-none transition placeholder:text-white/20 focus:border-[#b5f03c]/40",
                                        )}
                                        placeholder="Exercicio"
                                      />
                                      <input
                                        type="number"
                                        min="1"
                                        value={item.sets}
                                        onChange={(event) =>
                                          updateTrainingSlotItem(
                                            slot.id,
                                            item.id,
                                            { sets: event.target.value },
                                          )
                                        }
                                        className={fieldClass(
                                          `${prefix}.items.${itemIndex}.sets`,
                                          "rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-2.5 text-sm font-normal text-white outline-none transition placeholder:text-white/20 focus:border-[#b5f03c]/40",
                                        )}
                                        placeholder="Series"
                                      />
                                      <input
                                        type="text"
                                        value={item.reps}
                                        onChange={(event) =>
                                          updateTrainingSlotItem(
                                            slot.id,
                                            item.id,
                                            { reps: event.target.value },
                                          )
                                        }
                                        className={fieldClass(
                                          `${prefix}.items.${itemIndex}.reps`,
                                          "rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-2.5 text-sm font-normal text-white outline-none transition placeholder:text-white/20 focus:border-[#b5f03c]/40",
                                        )}
                                        placeholder="Reps"
                                      />
                                      <input
                                        type="number"
                                        min="0"
                                        value={item.restSeconds}
                                        onChange={(event) =>
                                          updateTrainingSlotItem(
                                            slot.id,
                                            item.id,
                                            { restSeconds: event.target.value },
                                          )
                                        }
                                        className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-2.5 text-sm font-normal text-white outline-none transition placeholder:text-white/20 focus:border-[#b5f03c]/40"
                                        placeholder="Descanso"
                                      />
                                      <button
                                        type="button"
                                        onClick={() =>
                                          removeTrainingSlotItem(slot.id, item.id)
                                        }
                                        className="rounded-lg border border-white/[0.07] p-2 text-white/45 transition hover:text-red-300"
                                        title="Remover exercicio"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : null}
              </section>

              <button
                type="submit"
                className="flex items-center gap-2 rounded-lg bg-[#b5f03c] px-5 py-2.5 text-xs font-bold uppercase tracking-[0.2em] text-black transition hover:brightness-110"
              >
                <Plus size={14} />
                {t(
                  "ADMIN_DASH_CREATE_STUDENT_BUTTON_THIAGOIAZZETTI",
                  "Criar aluno",
                )}
              </button>
            </form>
          </article>

          <article className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white/60">
                {t(
                  "ADMIN_DASH_STUDENTS_LIST_TITLE_THIAGOIAZZETTI",
                  "Alunos cadastrados",
                )}
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
                  {t("ADMIN_DASH_OVERDUE_THIAGOIAZZETTI", "atrasados")}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  {
                    students.filter(
                      (s) => getBillingStatus(s).key === "pending",
                    ).length
                  }{" "}
                  {t("ADMIN_DASH_PENDING_THIAGOIAZZETTI", "pendentes")}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {
                    students.filter((s) => getBillingStatus(s).key === "paid")
                      .length
                  }{" "}
                  {t("ADMIN_DASH_PAID_THIAGOIAZZETTI", "pagos")}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {students.length === 0 ? (
                <p className="rounded-lg border border-white/[0.07] px-4 py-6 text-center text-sm text-white/35">
                  {t(
                    "ADMIN_DASH_NO_STUDENTS_THIAGOIAZZETTI",
                    "Nenhum aluno cadastrado ainda.",
                  )}
                </p>
              ) : (
                students.map((student) => {
                  const billingStatus = localizeBillingStatus(
                    getBillingStatus(student),
                    locale,
                  );
                  return (
                    <div
                      key={student.id}
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        navigate(`/admin/alunos/${student.id}/treinos`, {
                          state: { studentName: student.fullName },
                        })
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          navigate(`/admin/alunos/${student.id}/treinos`, {
                            state: { studentName: student.fullName },
                          });
                        }
                      }}
                      className={`cursor-pointer rounded-xl border px-4 py-4 transition-all duration-200 hover:bg-white/[0.02] ${billingStatus.cardClass}`}
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {student.fullName}
                          </p>
                          <p className="text-xs text-white/40 mt-0.5">
                            {student.email ||
                              t(
                                "ADMIN_DASH_NO_EMAIL_THIAGOIAZZETTI",
                                "Sem email",
                              )}
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
                            onClick={(event) => {
                              event.stopPropagation();
                              startEditStudent(student);
                            }}
                            className="rounded-lg border border-white/[0.07] p-1.5 text-white/35 transition hover:border-[#b5f03c]/30 hover:text-[#b5f03c]"
                            title="Editar aluno"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDeleteStudent(student);
                            }}
                            disabled={deletingStudentId === student.id}
                            className="rounded-lg border border-red-400/20 p-1.5 text-red-200/45 transition hover:border-red-300/50 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                            title="Excluir aluno"
                          >
                            {deletingStudentId === student.id ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Trash2 size={13} />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2 text-xs md:grid-cols-2 xl:grid-cols-5">
                        <div className="rounded-lg border border-white/[0.05] bg-black/20 px-3 py-2">
                          <p className="text-white/25 text-[10px]">
                            {t("ADMIN_DASH_COL_PLAN_THIAGOIAZZETTI", "Plano")}
                          </p>
                          <p className="mt-0.5 font-semibold text-white/75">
                            {student.alunoPlan?.name ||
                              t(
                                "ADMIN_DASH_NO_PLAN_THIAGOIAZZETTI",
                                "Sem plano",
                              )}
                          </p>
                        </div>
                        <div className="rounded-lg border border-white/[0.05] bg-black/20 px-3 py-2">
                          <p className="text-white/25 text-[10px]">
                            {t(
                              "ADMIN_DASH_COL_MONTHLY_THIAGOIAZZETTI",
                              "Cobrança",
                            )}
                          </p>
                          <p className="mt-0.5 font-semibold text-[#b5f03c]">
                            {student.alunoPlan
                              ? `${formatCurrency(
                                  (student.alunoPlan.monthlyPriceCents || 0) / 100,
                                )} ${getBillingIntervalSuffix(student.alunoPlan)}`
                              : "—"}
                          </p>
                        </div>
                        <div className="rounded-lg border border-white/[0.05] bg-black/20 px-3 py-2">
                          <p className="text-white/25 text-[10px]">
                            {t(
                              "ADMIN_DASH_COL_STATUS_THIAGOIAZZETTI",
                              "Status",
                            )}
                          </p>
                          <p
                            className={`mt-0.5 font-semibold ${billingStatus.accentClass}`}
                          >
                            {billingStatus.label}
                          </p>
                        </div>
                        <div className="rounded-lg border border-white/[0.05] bg-black/20 px-3 py-2">
                          <p className="text-white/25 text-[10px]">
                            {t(
                              "ADMIN_DASH_COL_DUE_DATE_THIAGOIAZZETTI",
                              "Vencimento",
                            )}
                          </p>
                          <p className="mt-0.5 font-semibold text-white/65">
                            {student.planDueDate
                              ? formatDate(student.planDueDate)
                              : "—"}
                          </p>
                        </div>
                        <div className="rounded-lg border border-white/[0.05] bg-black/20 px-3 py-2">
                          <p className="text-white/25 text-[10px]">
                            {t(
                              "ADMIN_DASH_COL_PHONE_THIAGOIAZZETTI",
                              "Telefone",
                            )}
                          </p>
                          <p className="mt-0.5 font-semibold text-white/65">
                            {student.phone || "—"}
                          </p>
                        </div>
                      </div>

                      {editingStudentId === student.id ? (
                        <div
                          className="mt-4 rounded-xl border border-white/[0.07] bg-black/30 p-4"
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
                        >
                          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-[#b5f03c]/60">
                            {t(
                              "ADMIN_DASH_EDIT_STUDENT_THIAGOIAZZETTI",
                              "Editar aluno",
                            )}
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
                              placeholder={t(
                                "ADMIN_DASH_FULL_NAME_THIAGOIAZZETTI",
                                "Nome completo",
                              )}
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
                              placeholder={t(
                                "ADMIN_DASH_PHONE_THIAGOIAZZETTI",
                                "Telefone",
                              )}
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
                              <option value="">
                                {t(
                                  "ADMIN_DASH_NO_PLAN_THIAGOIAZZETTI",
                                  "Sem plano",
                                )}
                              </option>
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
                            <input
                              type="password"
                              value={editStudentForm.password}
                              onChange={(e) =>
                                setEditStudentForm((prev) => ({
                                  ...prev,
                                  password: e.target.value,
                                }))
                              }
                              className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-[#b5f03c]/40"
                              placeholder="Nova senha"
                              autoComplete="new-password"
                            />
                            <input
                              type="password"
                              value={editStudentForm.confirmPassword}
                              onChange={(e) =>
                                setEditStudentForm((prev) => ({
                                  ...prev,
                                  confirmPassword: e.target.value,
                                }))
                              }
                              className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-[#b5f03c]/40"
                              placeholder="Confirmar nova senha"
                              autoComplete="new-password"
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
                              {t(
                                "ADMIN_DASH_ACTIVE_STUDENT_THIAGOIAZZETTI",
                                "Aluno ativo",
                              )}
                            </label>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleSaveStudent(student.id);
                              }}
                              className="rounded-lg bg-[#b5f03c] px-4 py-2 text-xs font-bold text-black transition hover:brightness-110"
                            >
                              {t("ADMIN_DASH_SAVE_THIAGOIAZZETTI", "Salvar")}
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setEditingStudentId("");
                              }}
                              className="rounded-lg border border-white/[0.07] px-4 py-2 text-xs text-white/45 transition hover:text-white"
                            >
                              {t(
                                "ADMIN_DASH_CANCEL_THIAGOIAZZETTI",
                                "Cancelar",
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDeleteStudent(student);
                              }}
                              disabled={deletingStudentId === student.id}
                              className="inline-flex items-center gap-2 rounded-lg border border-red-400/25 px-4 py-2 text-xs font-bold text-red-200/70 transition hover:border-red-300/60 hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {deletingStudentId === student.id ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <Trash2 size={13} />
                              )}
                              Excluir aluno
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
              {editingPlanId
                ? t("ADMIN_DASH_EDIT_PLAN_THIAGOIAZZETTI", "Editar plano")
                : t(
                    "ADMIN_DASH_CREATE_PLAN_THIAGOIAZZETTI",
                    "Criar novo plano",
                  )}
            </h2>
            <form className="space-y-4" onSubmit={handleSavePlan}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">
                  {t(
                    "ADMIN_DASH_PLAN_NAME_LABEL_THIAGOIAZZETTI",
                    "Nome do plano",
                  )}
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
                    placeholder={t(
                      "ADMIN_DASH_PLAN_NAME_PLACEHOLDER_THIAGOIAZZETTI",
                      "Ex: Plano Premium",
                    )}
                  />
                </label>
                <label className="block text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">
                  {t(
                    "ADMIN_DASH_PLAN_PRICE_LABEL_THIAGOIAZZETTI",
                    "Valor da cobrança (R$)",
                  )}
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
                <label className="block text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">
                  {t(
                    "ADMIN_DASH_PLAN_BILLING_INTERVAL_LABEL_THIAGOIAZZETTI",
                    "Recorrência de cobrança",
                  )}
                  <select
                    required
                    value={newPlanForm.billingIntervalMonths}
                    onChange={(e) =>
                      setNewPlanForm((prev) => ({
                        ...prev,
                        billingIntervalMonths: Number(e.target.value),
                      }))
                    }
                    className={`mt-2 w-full rounded-lg border bg-white/[0.04] px-3 py-2.5 text-sm font-normal text-white outline-none transition focus:border-[#b5f03c]/40 ${
                      isValidBillingIntervalMonths(
                        newPlanForm.billingIntervalMonths,
                      )
                        ? "border-white/[0.07]"
                        : "border-red-400/70"
                    }`}
                  >
                    {BILLING_INTERVAL_OPTIONS.map((option) => (
                      <option
                        key={option.value}
                        value={option.value}
                        className="bg-[#111] text-white"
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">
                {t("ADMIN_DASH_PLAN_DESC_LABEL_THIAGOIAZZETTI", "Descrição")}
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
                  placeholder={t(
                    "ADMIN_DASH_PLAN_DESC_PLACEHOLDER_THIAGOIAZZETTI",
                    "Descreva o plano...",
                  )}
                  rows={3}
                />
              </label>
              <label className="inline-flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/60">
                <input
                  type="checkbox"
                  checked={newPlanForm.isActive}
                  onChange={(e) =>
                    setNewPlanForm((prev) => ({
                      ...prev,
                      isActive: e.target.checked,
                    }))
                  }
                />
                {t("ADMIN_DASH_ACTIVE_PLAN_THIAGOIAZZETTI", "Plano ativo")}
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-lg bg-[#b5f03c] px-5 py-2.5 text-xs font-bold uppercase tracking-[0.2em] text-black transition hover:brightness-110"
                >
                  <Plus size={14} />
                  {editingPlanId
                    ? t(
                        "ADMIN_DASH_SAVE_PLAN_BUTTON_THIAGOIAZZETTI",
                        "Salvar plano",
                      )
                    : t(
                        "ADMIN_DASH_CREATE_PLAN_BUTTON_THIAGOIAZZETTI",
                        "Criar plano",
                      )}
                </button>
                {editingPlanId ? (
                  <button
                    type="button"
                    onClick={resetPlanForm}
                    className="rounded-lg border border-white/[0.07] px-5 py-2.5 text-xs font-bold uppercase tracking-[0.2em] text-white/55 transition hover:border-white/20 hover:text-white"
                  >
                    {t("ADMIN_DASH_CANCEL_PLAN_EDIT_THIAGOIAZZETTI", "Cancelar")}
                  </button>
                ) : null}
              </div>
            </form>
          </article>

          <article className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6">
            <h2 className="mb-5 text-sm font-bold text-white/60">
              {t(
                "ADMIN_DASH_PLANS_LIST_TITLE_THIAGOIAZZETTI",
                "Planos de assinatura",
              )}
              <span className="ml-2 rounded-md bg-white/[0.07] px-2 py-0.5 text-xs font-normal text-white/40">
                {plans.length}
              </span>
            </h2>
            <div className="space-y-2">
              {plans.length === 0 ? (
                <p className="rounded-lg border border-white/[0.07] px-4 py-6 text-center text-sm text-white/35">
                  {t(
                    "ADMIN_DASH_NO_PLANS_THIAGOIAZZETTI",
                    "Nenhum plano criado ainda.",
                  )}
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
                        {plan.description ||
                          t(
                            "ADMIN_DASH_PREMIUM_PLAN_THIAGOIAZZETTI",
                            "Plano premium",
                          )}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-lg font-black text-[#b5f03c]">
                        {formatCurrency((plan.monthlyPriceCents || 0) / 100)}
                        <span className="text-xs font-normal text-white/35">
                          {getBillingIntervalSuffix(plan)}
                        </span>
                      </p>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => startEditPlan(plan)}
                          className="rounded-lg border border-white/[0.07] p-1.5 text-white/35 transition hover:border-[#b5f03c]/30 hover:text-[#b5f03c]"
                          title="Editar plano"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePlan(plan)}
                          disabled={deletingPlanId === plan.id}
                          className="rounded-lg border border-white/[0.07] p-1.5 text-white/35 transition hover:border-red-400/30 hover:text-red-400"
                          title="Excluir plano"
                        >
                          {deletingPlanId === plan.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Trash2 size={13} />
                          )}
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
  const { t } = useI18n();
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
  const [deletingMessageId, setDeletingMessageId] = useState("");
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

  const handleDeleteMessage = async (messageId) => {
    if (!messageId || String(messageId).startsWith("opt-")) return;
    const confirmed = window.confirm("Excluir esta mensagem?");
    if (!confirmed) return;

    setDeletingMessageId(messageId);
    try {
      await deleteMessage(messageId);
      setMessages((prev) => prev.filter((message) => message.id !== messageId));
    } catch (error) {
      window.alert(
        error?.status === 404
          ? "A rota DELETE /messages/:id ainda não existe no backend. Use o prompt em docs/backend-delete-event-message-prompt.md."
          : error?.message || "Não foi possível excluir a mensagem.",
      );
    } finally {
      setDeletingMessageId("");
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
            {t("ADMIN_CHAT_CONVERSATIONS_THIAGOIAZZETTI", "Conversas")}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {activeStudents.length === 0 ? (
            <p className="px-4 py-6 text-xs text-white/30 text-center">
              {t(
                "ADMIN_CHAT_NO_ACTIVE_STUDENTS_THIAGOIAZZETTI",
                "Nenhum aluno ativo",
              )}
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
                    {aluno.email ||
                      t("ADMIN_CHAT_NO_EMAIL_THIAGOIAZZETTI", "sem e-mail")}
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
              {t(
                "ADMIN_CHAT_SELECT_STUDENT_THIAGOIAZZETTI",
                "Selecione um aluno para iniciar uma conversa",
              )}
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
                  {t(
                    "ADMIN_CHAT_NO_MESSAGES_THIAGOIAZZETTI",
                    "Nenhuma mensagem ainda. Inicie a conversa!",
                  )}
                </p>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderRole === "PERSONAL";
                  const forwarded = parseForwardMessage(msg.content);
                  return (
                    <div
                      key={msg.id}
                      className={`group flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      {!isMe ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteMessage(msg.id)}
                          disabled={
                            deletingMessageId === msg.id ||
                            String(msg.id).startsWith("opt-")
                          }
                          className="mb-1 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.07] text-white/20 opacity-0 transition hover:border-red-300/50 hover:text-red-200 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-20"
                          title="Excluir mensagem"
                        >
                          {deletingMessageId === msg.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Trash2 size={13} />
                          )}
                        </button>
                      ) : null}
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
                                ? t(
                                    "ADMIN_CHAT_WORKOUT_FORWARDED_THIAGOIAZZETTI",
                                    "Treino encaminhado",
                                  )
                                : t(
                                    "ADMIN_CHAT_DIET_FORWARDED_THIAGOIAZZETTI",
                                    "Dieta encaminhada",
                                  )}
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
                      {isMe ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteMessage(msg.id)}
                          disabled={
                            deletingMessageId === msg.id ||
                            String(msg.id).startsWith("opt-")
                          }
                          className="mb-1 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.07] text-white/20 opacity-0 transition hover:border-red-300/50 hover:text-red-200 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-20"
                          title="Excluir mensagem"
                        >
                          {deletingMessageId === msg.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Trash2 size={13} />
                          )}
                        </button>
                      ) : null}
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
                    <option value="">
                      {t(
                        "ADMIN_CHAT_FORWARD_WORKOUT_THIAGOIAZZETTI",
                        "Encaminhar treino...",
                      )}
                    </option>
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
                    {t("ADMIN_CHAT_SEND_THIAGOIAZZETTI", "Enviar")}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedDietId}
                    onChange={(e) => setSelectedDietId(e.target.value)}
                    className="flex-1 rounded-lg border border-white/[0.08] bg-[#111] px-3 py-2 text-xs text-white/70 outline-none focus:border-[#b5f03c]/40"
                  >
                    <option value="">
                      {t(
                        "ADMIN_CHAT_FORWARD_DIET_THIAGOIAZZETTI",
                        "Encaminhar dieta...",
                      )}
                    </option>
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
                    {t("ADMIN_CHAT_SEND_THIAGOIAZZETTI", "Enviar")}
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
                  placeholder={t(
                    "ADMIN_CHAT_INPUT_PLACEHOLDER_THIAGOIAZZETTI",
                    "Digite uma mensagem...",
                  )}
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
