import axios from "axios";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000",
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("career_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isLoginRequest = error.config && error.config.url === "/auth/login";
      localStorage.removeItem("career_token");
      if (typeof window !== "undefined" && !isLoginRequest && window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default client;

export function getApiErrorMessage(error, fallback = "Something went wrong.") {
  const detail = error.response?.data?.detail;
  if (detail) {
    return Array.isArray(detail)
      ? detail.map((item) => item.msg || String(item)).join(" ")
      : detail;
  }

  if (error.request && !error.response) {
    return "Cannot reach the backend server. Start FastAPI on http://127.0.0.1:8000 and try again.";
  }

  return error.message || fallback;
}

export async function getRecommendations({ mode = "internship", query = "", location = "" } = {}, options = {}) {
  const endpoint = mode === "job" ? "/recommend/jobs" : "/recommend/internships";
  const params = {};

  if (query.trim()) {
    params.query = query.trim();
  }
  if (location.trim()) {
    params.location = location.trim();
  }

  const { data } = await client.get(endpoint, {
    params,
    signal: options.signal,
  });
  return data;
}

export async function getSemanticRecommendations(params = {}) {
  const { data } = await client.get("/recommend/semantic-jobs", { params });
  return data;
}

export async function postFeedback(payload) {
  const { data } = await client.post("/feedback", payload);
  return data;
}

export async function getJob(jobId, options = {}) {
  const { data } = await client.get(`/jobs/${jobId}`, { signal: options.signal });
  return data;
}

export async function applyForInternalJob(payload) {
  const { data } = await client.post("/apply", payload);
  return data;
}
