const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3001"
).replace(/\/$/, "");

export const SESSION_TOKEN_KEY = "thiago_session_token";
export const SESSION_USER_KEY = "thiago_session_user";

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
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

  const transactionAmount = Number(
    plan.transaction_amount ??
      plan.transactionAmount ??
      Number(plan.monthlyPriceCents || 0) / 100,
  );
  const frequency = Number(plan.frequency ?? plan.repetition ?? 1);
  const recurringPlanId =
    plan.preapproval_plan_id || plan.preapprovalPlanId || null;
  const id =
    plan.id ||
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
    frequencyType: plan.frequency_type || plan.frequencyType || "months",
    monthlyPriceCents:
      plan.monthlyPriceCents || Math.round((transactionAmount || 0) * 100),
    isRecurringEnabled: Boolean(recurringPlanId),
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
    );
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function login(payload) {
  const response = await request("/auth/login", {
    method: "POST",
    body: payload,
    auth: false,
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

export async function me() {
  return request("/auth/me");
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
    const response = await request(
      "/payments/recurring/subscriptions/plans/public",
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

export async function listStudentPlans(tenantId) {
  const response = await request("/aluno-plans", { tenantId });
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

export async function createWorkoutPlan(payload, tenantId) {
  const response = await request("/workout-plans", {
    method: "POST",
    body: payload,
    tenantId,
  });
  return response?.plan || response;
}

export async function updateWorkoutPlan(planId, payload) {
  return request(`/workout-plans/${planId}`, {
    method: "PATCH",
    body: payload,
  });
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
