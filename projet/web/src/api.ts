import axios from "axios";
import { useAuthStore } from "./stores/auth";

function normalizeBaseUrl(raw: any): string {
  let v = typeof raw === "string" ? raw.trim() : "";
  if (!v) return "http://localhost:8084";

  // Common mistake: ":8084" -> should be "http://localhost:8084"
  if (v.startsWith(":")) return `http://localhost${v}`;

  // Common mistake: "localhost:8084" (no scheme)
  if (!/^https?:\/\//i.test(v) && /^[a-z0-9.-]+:\d+/i.test(v)) return `http://${v}`;

  return v;
}

export const api = axios.create({
  // In dev: use Vite proxy (/api -> backend) to avoid CORS + bad ":8084" URLs
  baseURL: import.meta.env.DEV ? "" : normalizeBaseUrl(import.meta.env.VITE_IDP_API_BASE_URL),
  headers: { "Content-Type": "application/json" }
});

api.interceptors.request.use((config) => {
  const auth = useAuthStore();
  if (auth.accessToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${auth.accessToken}`;
  }
  return config;
});

