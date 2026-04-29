const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export async function tenantFetch(path, personalId, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const headers = {
    "Content-Type": "application/json",
    "x-personal-id": personalId,
    ...(options.headers || {}),
  };

  let body = options.body;

  if (body && typeof body === "object" && method !== "GET") {
    body = JSON.stringify({
      ...body,
      personal_id: personalId,
    });
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(
      payload.error || payload.message || "Erro ao consultar API",
    );
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}
