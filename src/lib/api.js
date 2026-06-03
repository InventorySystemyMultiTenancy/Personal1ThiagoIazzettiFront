const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3001"
).replace(/\/$/, "");

export const SESSION_TOKEN_KEY = "thiago_session_token";
export const SESSION_USER_KEY = "thiago_session_user";

export class ApiError extends Error {
  constructor(message, status, code, details = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function buildUrl(path) {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function readStoredUser() {
  try {
    const raw = localStorage.getItem(SESSION_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getStoredSession() {
  const token = localStorage.getItem(SESSION_TOKEN_KEY);
  const user = readStoredUser();

  if (!token || !user) {
    return null;
  }

  return { token, user };
}

export function setStoredSession(session) {
  localStorage.setItem(SESSION_TOKEN_KEY, session.token);
  localStorage.setItem(SESSION_USER_KEY, JSON.stringify(session.user));
}

export function clearStoredSession() {
  localStorage.removeItem(SESSION_TOKEN_KEY);
  localStorage.removeItem(SESSION_USER_KEY);
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
}

export function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
  }).format(date);
}

function extractListPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.plans)) return payload.plans;
  if (Array.isArray(payload?.subscriptions)) return payload.subscriptions;
  return [];
}

function normalizeRecurringPlan(plan) {
  if (!plan || typeof plan !== "object") {
    return null;
  }

  const recurringPlanId =
    plan.preapproval_plan_id ||
    plan.preapprovalPlanId ||
    plan.preapprovalPlanID ||
    plan.preapproval_plan ||
    plan.preapprovalPlan ||
    plan.preapproval?.id ||
    plan.preapprovalPlan?.id ||
    plan.mercadoPagoPreapprovalPlanId ||
    plan.mercado_pago_preapproval_plan_id ||
    plan.recurringPlanId ||
    plan.recurring_plan_id ||
    null;

  const transactionAmount = Number(
    plan.transaction_amount ??
      plan.transactionAmount ??
      plan.amount ??
      plan.price ??
      Number(plan.monthlyPriceCents || 0) / 100,
  );
  const frequency = Number(
    plan.frequency ?? plan.repetition ?? plan.interval_count ?? 1,
  );
  const id =
    plan.id ||
    plan.alunoPlanId ||
    plan.aluno_plan_id ||
    plan.planId ||
    plan.plan_id ||
    recurringPlanId ||
    `${plan.name || "plano"}-${transactionAmount || 0}-${frequency || 1}`;

  return {
    ...plan,
    id: String(id),
    name: plan.name || plan.title || "Plano mensal",
    description: plan.description || "",
    recurringPlanId,
    transactionAmount: Number.isFinite(transactionAmount)
      ? transactionAmount
      : 0,
    frequency: Number.isFinite(frequency) && frequency > 0 ? frequency : 1,
    frequencyType:
      plan.frequency_type ||
      plan.frequencyType ||
      plan.interval ||
      plan.interval_unit ||
      "months",
    monthlyPriceCents:
      plan.monthlyPriceCents || Math.round((transactionAmount || 0) * 100),
    isRecurringEnabled:
      Boolean(recurringPlanId) ||
      plan.isRecurringEnabled === true ||
      plan.recurringEnabled === true,
  };
}

async function request(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const storedSession = getStoredSession();
  if (storedSession?.token && options.auth !== false) {
    headers.set("Authorization", `Bearer ${storedSession.token}`);
  }

  if (options.tenantId) {
    headers.set("x-personal-id", options.tenantId);
  }

  let body = options.body;
  if (
    body &&
    typeof body === "object" &&
    !(body instanceof FormData) &&
    method !== "GET"
  ) {
    body = JSON.stringify(body);
  }

  const response = await fetch(buildUrl(path), {
    method,
    headers,
    body,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new ApiError(
      payload.error || payload.message || "Erro ao consultar API",
      response.status,
      payload.code,
      payload,
    );
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function login(payload, tenantId) {
  const response = await request("/auth/login", {
    method: "POST",
    body: payload,
    auth: false,
    tenantId,
  });

  return {
    token: response.accessToken,
    user: response.user,
  };
}

export async function registerClient(payload) {
  const response = await request("/auth/register", {
    method: "POST",
    body: payload,
    auth: false,
  });

  return {
    token: response.accessToken,
    user: response.user,
  };
}

export async function me(tenantId) {
  return request("/auth/me", { tenantId });
}

export async function getPublicPlans(personalId) {
  const response = await request("/aluno-plans/public", {
    tenantId: personalId,
    auth: false,
  });
  return Array.isArray(response?.plans) ? response.plans : [];
}

export async function listRecurringSubscriptionPlans(
  recurringPersonalId,
  publicTenantId = recurringPersonalId,
) {
  const fallbackToPublicPlans = async () => {
    if (!publicTenantId) {
      return [];
    }

    const fallbackPlans = await getPublicPlans(publicTenantId);
    return fallbackPlans.map(normalizeRecurringPlan).filter(Boolean);
  };

  try {
    const query = recurringPersonalId
      ? `?personalId=${encodeURIComponent(recurringPersonalId)}`
      : "";
    const response = await request(
      `/payments/recurring/subscriptions/plans/public${query}`,
      {
        tenantId: recurringPersonalId,
        auth: false,
      },
    );

    const recurringPlans = extractListPayload(response)
      .map(normalizeRecurringPlan)
      .filter(Boolean);

    if (recurringPlans.length > 0) {
      return recurringPlans;
    }

    return fallbackToPublicPlans();
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.status !== 404 &&
      error.status !== 400
    ) {
      throw error;
    }

    return fallbackToPublicPlans();
  }
}

export async function createRecurringSubscription(payload, tenantId) {
  const response = await request("/payments/recurring/subscriptions", {
    method: "POST",
    body: payload,
    tenantId,
  });

  return response?.subscription || response?.data || response;
}

export async function createPixRecurringSubscription(payload, tenantId) {
  const response = await request("/payments/recurring/subscriptions/pix", {
    method: "POST",
    body: payload,
    tenantId,
  });

  return response?.data || response;
}

export async function renewPixRecurringSubscription(
  subscriptionId,
  payload = {},
  tenantId,
) {
  const response = await request(
    `/payments/recurring/subscriptions/${subscriptionId}/pix`,
    {
      method: "POST",
      body: payload,
      tenantId,
    },
  );

  return response?.data || response;
}

export async function getRecurringSubscription(subscriptionId, tenantId) {
  const response = await request(
    `/payments/recurring/subscriptions/${subscriptionId}`,
    { tenantId },
  );

  return response?.data || response?.subscription || response;
}

export async function listStudents(tenantId) {
  return request("/alunos", { tenantId });
}

export async function getMyStudentProfile(tenantId) {
  return request("/alunos/me", { tenantId });
}

export async function createStudent(payload, tenantId) {
  return request("/alunos", { method: "POST", body: payload, tenantId });
}

export async function updateStudent(studentId, payload, tenantId) {
  return request(`/alunos/${studentId}`, {
    method: "PATCH",
    body: payload,
    tenantId,
  });
}

export async function updateMyProfile(payload, tenantId) {
  return request(`/alunos/me`, { method: "PATCH", body: payload, tenantId });
}

export async function listStudentPlans(tenantId) {
  const response = await request("/aluno-plans", { tenantId });
  return Array.isArray(response?.plans) ? response.plans : [];
}

export async function listPublicStudentPlans(tenantId) {
  const path = tenantId
    ? `/aluno-plans/public?personalId=${encodeURIComponent(tenantId)}`
    : "/aluno-plans/public";
  const response = await request(path, { auth: false });
  return Array.isArray(response?.plans) ? response.plans : [];
}

export async function createStudentPlan(payload, tenantId) {
  const response = await request("/aluno-plans", {
    method: "POST",
    body: payload,
    tenantId,
  });
  return response?.plan || response;
}

export async function updateStudentPlan(planId, payload, tenantId) {
  const response = await request(`/aluno-plans/${planId}`, {
    method: "PATCH",
    body: payload,
    tenantId,
  });
  return response?.plan || response;
}

export async function deleteStudentPlan(planId, tenantId) {
  return request(`/aluno-plans/${planId}`, {
    method: "DELETE",
    tenantId,
  });
}

export async function assignPlanToStudent(studentId, alunoPlanId, tenantId) {
  return request(`/aluno-plans/assign/${studentId}`, {
    method: "PATCH",
    body: { alunoPlanId },
    tenantId,
  });
}

export async function assignPlanToMyAccount(alunoPlanId, tenantId) {
  return request("/aluno-plans/me/assign", {
    method: "POST",
    body: { alunoPlanId },
    tenantId,
  });
}

export async function listWorkoutPlans(studentId, tenantId) {
  const query = studentId ? `?alunoId=${encodeURIComponent(studentId)}` : "";
  const response = await request(`/workout-plans${query}`, { tenantId });
  return Array.isArray(response?.plans) ? response.plans : [];
}

export async function listAssessments(alunoId, tenantId) {
  const response = await request(
    `/assessments/aluno/${encodeURIComponent(alunoId)}`,
    { tenantId },
  );
  return Array.isArray(response)
    ? response
    : Array.isArray(response?.data)
      ? response.data
      : [];
}

export async function createAssessment(payload, tenantId) {
  const response = await request(`/assessments`, {
    method: "POST",
    body: payload,
    tenantId,
  });
  return response;
}

export async function deleteAssessment(id, tenantId) {
  const response = await request(`/assessments/${encodeURIComponent(id)}`, {
    method: "DELETE",
    tenantId,
  });
  return response;
}

export async function listPersonalEvents(tenantId) {
  const response = await request("/personal-events", { tenantId });
  return Array.isArray(response?.events) ? response.events : [];
}

export async function createPersonalEvent(payload, tenantId) {
  const response = await request("/personal-events", {
    method: "POST",
    body: payload,
    tenantId,
  });
  return response?.event || response;
}

export async function listMyPersonalEvents(tenantId) {
  const response = await request("/personal-events/me", { tenantId });
  return Array.isArray(response?.events) ? response.events : [];
}

export async function respondPersonalEvent(eventId, status, tenantId) {
  const response = await request(`/personal-events/${eventId}/respond`, {
    method: "PATCH",
    body: { status },
    tenantId,
  });
  return response?.participant || response;
}

export async function listWorkoutPlanTemplates(tenantId) {
  const response = await request("/workout-plans/templates", { tenantId });
  if (Array.isArray(response?.templates)) return response.templates;
  return extractListPayload(response);
}

export async function createWorkoutPlanTemplate(payload, tenantId) {
  const response = await request("/workout-plans/templates", {
    method: "POST",
    body: payload,
    tenantId,
  });
  return response?.template || response?.plan || response?.data || response;
}

export async function cloneWorkoutPlanTemplate(templateId, payload, tenantId) {
  const response = await request(
    `/workout-plans/templates/${templateId}/clone`,
    {
      method: "POST",
      body: payload,
      tenantId,
    },
  );
  return response?.plan || response?.data || response;
}

export async function getWorkoutPlanDetails(planId, tenantId) {
  const response = await request(`/workout-plans/${planId}`, { tenantId });
  return response?.plan || response?.data || response;
}

export async function createWorkoutPlan(payload, tenantId) {
  const response = await request("/workout-plans", {
    method: "POST",
    body: payload,
    tenantId,
  });
  return response?.plan || response;
}

export async function scheduleWorkoutPlan(planId, payload, tenantId) {
  const response = await request(`/workout-plans/${planId}/schedule`, {
    method: "POST",
    body: payload,
    tenantId,
  });
  return response?.plan || response?.schedule || response?.data || response;
}

export async function listMyWorkoutPlans(tenantId) {
  const response = await request("/workout-plans/me", { tenantId });
  return Array.isArray(response?.plans) ? response.plans : [];
}

export async function updateWorkoutPlan(planId, payload, tenantId) {
  const response = await request(`/workout-plans/${planId}`, {
    method: "PATCH",
    body: payload,
    tenantId,
  });

  return response?.plan || response?.data || response;
}

export async function deleteWorkoutPlan(planId, tenantId) {
  return request(`/workout-plans/${planId}`, {
    method: "DELETE",
    tenantId,
  });
}

export async function listWorkoutSessions(tenantId, filters = {}) {
  const params = new URLSearchParams();
  if (filters.alunoId) params.set("alunoId", filters.alunoId);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await request(`/workout-sessions${query}`, { tenantId });
  return Array.isArray(response?.sessions) ? response.sessions : [];
}

export async function listMyWorkoutSessions(tenantId, filters = {}) {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await request(`/workout-sessions/me${query}`, { tenantId });
  return Array.isArray(response?.sessions) ? response.sessions : [];
}

export async function startWorkoutSession(payload, tenantId) {
  const response = await request("/workout-sessions/start", {
    method: "POST",
    body: payload,
    tenantId,
  });
  return response?.session || response;
}

export async function finishWorkoutSession(payload, tenantId) {
  const response = await request("/workout-sessions/finish", {
    method: "POST",
    body: payload,
    tenantId,
  });
  return response?.session || response;
}

export async function listAgendaEvents(tenantId, filters = {}) {
  const params = new URLSearchParams();
  if (filters.alunoId) params.set("alunoId", filters.alunoId);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await request(`/agenda${query}`, { tenantId });
  return Array.isArray(response?.events) ? response.events : [];
}

export async function listMyAgendaEvents(tenantId) {
  const response = await request("/agenda/me", { tenantId });
  return Array.isArray(response?.events) ? response.events : [];
}

export async function createAgendaEvent(payload, tenantId) {
  const response = await request("/agenda", {
    method: "POST",
    body: payload,
    tenantId,
  });
  return response?.event || response;
}

export async function updateAgendaEvent(eventId, payload, tenantId) {
  const response = await request(`/agenda/${eventId}`, {
    method: "PATCH",
    body: payload,
    tenantId,
  });
  return response?.event || response;
}

export async function deleteAgendaEvent(eventId, tenantId) {
  return request(`/agenda/${eventId}`, {
    method: "DELETE",
    tenantId,
  });
}

export async function confirmAgendaAttendance(
  eventId,
  attendanceStatus,
  tenantId,
) {
  const response = await request(`/agenda/${eventId}/attendance`, {
    method: "PATCH",
    body: { attendanceStatus },
    tenantId,
  });
  return response?.event || response;
}

export async function requestAgendaCancel(eventId, reason, tenantId) {
  const response = await request(`/agenda/${eventId}/request-cancel`, {
    method: "PATCH",
    body: { reason },
    tenantId,
  });
  return response?.event || response;
}

export async function requestAgendaReschedule(eventId, payload, tenantId) {
  const response = await request(`/agenda/${eventId}/request-reschedule`, {
    method: "PATCH",
    body: payload,
    tenantId,
  });
  return response?.event || response;
}

export async function reviewAgendaChangeRequest(eventId, decision, tenantId) {
  return request(`/agenda/${eventId}/review-request`, {
    method: "PATCH",
    body: { decision },
    tenantId,
  });
}

export async function listDiets(tenantId, filters = {}) {
  const params = new URLSearchParams();
  if (filters.alunoId) params.set("alunoId", filters.alunoId);
  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await request(`/diets${query}`, { tenantId });
  return Array.isArray(response?.diets) ? response.diets : [];
}

export async function listMyDiets(tenantId) {
  const response = await request("/diets/me", { tenantId });
  return Array.isArray(response?.diets) ? response.diets : [];
}

export async function createDiet(payload, tenantId) {
  const response = await request("/diets", {
    method: "POST",
    body: payload,
    tenantId,
  });
  return response?.diet || response;
}

export async function updateDiet(dietId, payload, tenantId) {
  const response = await request(`/diets/${dietId}`, {
    method: "PATCH",
    body: payload,
    tenantId,
  });
  return response?.diet || response;
}

export async function deleteDiet(dietId, tenantId) {
  return request(`/diets/${dietId}`, {
    method: "DELETE",
    tenantId,
  });
}

export async function tenantFetch(path, personalId, options = {}) {
  return request(path, { ...options, tenantId: personalId });
}

// ── Messages ──────────────────────────────────────────────────────────────────

// Personal: list conversation with one aluno
export async function listMessages(alunoId) {
  const response = await request(`/messages/${alunoId}`);
  return Array.isArray(response?.messages) ? response.messages : [];
}

// Personal: send message to aluno
export async function sendMessage(alunoId, content) {
  const response = await request(`/messages/${alunoId}`, {
    method: "POST",
    body: { content },
  });
  return response?.message || response;
}

// Aluno: list my conversation
export async function listMyMessages() {
  const response = await request("/messages/me");
  return Array.isArray(response?.messages) ? response.messages : [];
}

// Aluno: send message to personal
export async function sendMyMessage(content) {
  const response = await request("/messages/me", {
    method: "POST",
    body: { content },
  });
  return response?.message || response;
}

// ── Custom Exercises ──────────────────────────────────────────────────────────

export async function listCustomExercises(tenantId) {
  const response = await request("/custom-exercises", { tenantId });
  return Array.isArray(response?.exercises) ? response.exercises : [];
}

export async function listCustomExercisesByGroup(muscleGroup, tenantId) {
  const response = await request(
    `/custom-exercises/by-group?muscleGroup=${encodeURIComponent(muscleGroup)}`,
    { tenantId },
  );
  return Array.isArray(response?.exercises) ? response.exercises : [];
}

export async function createCustomExercise(payload, tenantId) {
  const response = await request("/custom-exercises", {
    method: "POST",
    body: payload,
    tenantId,
  });
  return response?.exercise || response;
}

export async function updateCustomExercise(exerciseId, payload, tenantId) {
  const response = await request(`/custom-exercises/${exerciseId}`, {
    method: "PATCH",
    body: payload,
    tenantId,
  });
  return response?.exercise || response;
}

export async function deleteCustomExercise(exerciseId, tenantId) {
  return request(`/custom-exercises/${exerciseId}`, {
    method: "DELETE",
    tenantId,
  });
}

// ── Workout Templates ─────────────────────────────────────────────────────────

export async function listWorkoutTemplates(tenantId) {
  const response = await request("/workout-plans/templates", { tenantId });
  return Array.isArray(response?.templates) ? response.templates : [];
}

export async function createWorkoutTemplate(payload, tenantId) {
  const response = await request("/workout-plans/templates", {
    method: "POST",
    body: payload,
    tenantId,
  });
  return response?.template || response;
}

export async function updateWorkoutTemplate(templateId, payload, tenantId) {
  const response = await request(`/workout-plans/templates/${templateId}`, {
    method: "PATCH",
    body: payload,
    tenantId,
  });
  return response?.template || response;
}

export async function deleteWorkoutTemplate(templateId, tenantId) {
  return request(`/workout-plans/templates/${templateId}`, {
    method: "DELETE",
    tenantId,
  });
}
