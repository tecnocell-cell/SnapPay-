const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const API_BASE = `${API_URL}/api`;

async function request(endpoint, options = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({ message: response.statusText }));
    const err = new Error(data.message || data.error || "Erro na requisição");
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return response.json();
}

export const api = {
  get: (endpoint) => request(endpoint, { method: "GET" }),
  post: (endpoint, body) => request(endpoint, { method: "POST", body: JSON.stringify(body) }),
  put: (endpoint, body) => request(endpoint, { method: "PUT", body: JSON.stringify(body) }),
  del: (endpoint) => request(endpoint, { method: "DELETE" }),
};
