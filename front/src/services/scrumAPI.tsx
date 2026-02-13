const API_BASE =
  (import.meta.env.VITE_API_URL as string) || "http://localhost:5000";

export const setToken = (token: string | null) => {
  if (token) localStorage.setItem("sa_token", token);
};

export const getToken = () => localStorage.getItem("sa_token");

export const clearToken = () => localStorage.removeItem("sa_token");

export async function login(email: string, password: string) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    credentials: "include",
  });

  const data = await res.json().catch(() => ({}));

  if (res.ok && data.token) {
    setToken(data.token);
    return { success: true, user: data.user, token: data.token };
  }

  return {
    success: false,
    status: res.status,
    error: data?.error || data?.message || "Login failed",
    raw: data,
  };
}

export async function me() {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api/auth/me`, {
    method: "GET",
    headers,
    credentials: "include",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data;
  return data;
}

export async function register(
  username: string,
  email: string,
  password: string,
) {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
    credentials: "include",
  });

  const data = await res.json().catch(() => ({}));
  if (res.ok) {
    return { success: true, user: data.user };
  }

  return {
    success: false,
    status: res.status,
    error: data?.error || data?.message || "Registration failed",
    raw: data,
  };
}

export async function authFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  } as Record<string, any>;
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data;
  return data;
}

export default {
  login,
  register,
  me,
  authFetch,
  setToken,
  getToken,
  clearToken,
};
