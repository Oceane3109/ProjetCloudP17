import { defineStore } from "pinia";
import { api } from "../api";

type AuthResponse = { accessToken: string; expiresAt: string; role: string };

export const useAuthStore = defineStore("auth", {
  state: () => ({
    accessToken: "" as string,
    role: "" as string,
    expiresAt: "" as string
  }),
  getters: {
    isAuthed: (s) => Boolean(s.accessToken),
    isManager: (s) => s.role === "MANAGER"
  },
  actions: {
    hydrate() {
      if (this.accessToken) return;
      const raw = localStorage.getItem("auth");
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        this.accessToken = parsed.accessToken ?? "";
        this.role = parsed.role ?? "";
        this.expiresAt = parsed.expiresAt ?? "";
      } catch {
        // ignore
      }
    },
    persist() {
      localStorage.setItem(
        "auth",
        JSON.stringify({
          accessToken: this.accessToken,
          role: this.role,
          expiresAt: this.expiresAt
        })
      );
    },
    async login(email: string, password: string) {
      const { data } = await api.post<AuthResponse>("/api/auth/login", { email, password });
      this.accessToken = data.accessToken;
      this.role = data.role;
      this.expiresAt = data.expiresAt;
      this.persist();
    },
    async register(email: string, password: string) {
      await api.post("/api/auth/register", { email, password });
    },
    async logout() {
      try {
        await api.post("/api/auth/logout");
      } catch {
        // ignore
      } finally {
        this.accessToken = "";
        this.role = "";
        this.expiresAt = "";
        localStorage.removeItem("auth");
      }
    }
  }
});

