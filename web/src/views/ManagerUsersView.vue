<template>
  <div class="managerLayout">
    <div class="managerTopBar">
      <div>
        <h2 class="managerTitle">Manager — Utilisateurs</h2>
        <p class="muted" style="margin: 0;">Débloquer des comptes, consulter les stats et les notifications.</p>
      </div>

      <div class="managerTopActions">
        <div class="notifWrap">
          <button
            type="button"
            class="notifBtn"
            :class="{ notifBtnActive: showNotifPanel }"
            @click="showNotifPanel = !showNotifPanel"
            :aria-label="'Notifications'"
            title="Notifications et détails des signalements"
          >
            <svg class="notifIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span v-if="notifCounts.NEW > 0" class="notifBadge">{{ notifCounts.NEW }}</span>
            <span class="notifLabel">Notifications</span>
          </button>
          <div v-if="showNotifPanel" class="notifPanel" @click.stop>
            <div class="notifPanelTitle">Détails signalements</div>
            <div class="notifSummary">
              <div class="notifLine"><span class="notifStatus new">NEW</span> <strong>{{ notifCounts.NEW }}</strong> en attente</div>
              <div class="notifLine"><span class="notifStatus progress">IN_PROGRESS</span> <strong>{{ notifCounts.IN_PROGRESS }}</strong> en cours</div>
              <div class="notifLine"><span class="notifStatus done">DONE</span> <strong>{{ notifCounts.DONE }}</strong> terminés</div>
            </div>
            <div class="notifDelays">
              <div class="notifLine">Délai moyen NEW → DONE: <strong>{{ stats.avgDelayNewToDone }}</strong></div>
              <div class="notifLine">Délai moyen NEW → IN_PROGRESS: <strong>{{ stats.avgDelayNewToInProgress }}</strong></div>
              <div class="notifLine">Délai moyen IN_PROGRESS → DONE: <strong>{{ stats.avgDelayInProgressToDone }}</strong></div>
            </div>
            <div class="notifRecent" v-if="recentReports.length">
              <div class="notifPanelSubtitle">Derniers signalements</div>
              <ul>
                <li v-for="r in recentReports" :key="r.id">
                  <span
                    class="notifStatus"
                    :class="{ new: r.status === 'NEW', progress: r.status === 'IN_PROGRESS', done: r.status === 'DONE' }"
                    >{{ r.status }}</span
                  >
                  {{ r.title }}
                </li>
              </ul>
            </div>
            <p v-else class="muted small">Aucun signalement.</p>
          </div>
        </div>
      </div>
    </div>

    <div class="kpis">
      <div class="kpiCard">
        <div class="k">Utilisateurs bloqués</div>
        <div class="v">{{ lockedUsers.length }}</div>
      </div>
      <div class="kpiCard">
        <div class="k">Signalements DONE</div>
        <div class="v">{{ stats.countDone }}</div>
      </div>
      <div class="kpiCard">
        <div class="k">NEW → DONE</div>
        <div class="v">{{ stats.avgDelayNewToDone }}</div>
      </div>
      <div class="kpiCard">
        <div class="k">IN_PROGRESS → DONE</div>
        <div class="v">{{ stats.avgDelayInProgressToDone }}</div>
      </div>
    </div>

    <div class="managerTop">
      <div class="card">
        <div v-if="showNotifPanel" class="notifBackdrop" @click="showNotifPanel = false"></div>
        <div class="cardHeader">
          <h3 class="h1">Débloquer utilisateur</h3>
          <p class="muted" style="margin: 0;">Gère les comptes bloqués puis synchronise si nécessaire.</p>
        </div>
        <div class="cardBody">
          <div class="form" style="margin-bottom: 12px;">
            <button class="btn btnOutline" type="button" @click="createDemoLocked" :disabled="loading">
              Créer un utilisateur bloqué (démo)
            </button>
            <label>
              Utilisateurs bloqués
              <select v-model="selectedLockedId">
                <option value="">-- sélectionner --</option>
                <option v-for="u in lockedUsers" :key="u.id" :value="u.id">
                  {{ u.email }} (tentatives: {{ u.failedLoginAttempts }})
                </option>
              </select>
            </label>
            <button class="btn btnPrimary" type="button" @click="unlockSelected" :disabled="loading || !selectedLockedId">
              {{ loading ? "..." : "Débloquer (sélection)" }}
            </button>
          </div>

          <details>
            <summary class="muted">Débloquer par email (optionnel)</summary>
            <form class="form" @submit.prevent="unlock">
              <label>
                Email
                <input v-model="email" type="email" />
              </label>
              <button class="btn btnOutline" type="submit" :disabled="loading || !email">
                {{ loading ? "..." : "Débloquer (email)" }}
              </button>
            </form>
          </details>

          <p v-if="unlockOk" class="ok">Débloqué</p>
          <p v-if="error" class="error">{{ error }}</p>
        </div>
      </div>

      <div class="card">
        <div class="cardHeader">
          <h3 class="h1">Statistiques</h3>
          <p class="muted">Délais de traitement des signalements (NEW → DONE).</p>
        </div>
        <div class="cardBody statsPanel">
          <div class="statRow">
            <span class="statLabel">Signalements terminés (DONE)</span>
            <span class="statValue">{{ stats.countDone }}</span>
          </div>
          <div class="statRow">
            <span class="statLabel">Délai moyen NEW → DONE</span>
            <span class="statValue">{{ stats.avgDelayNewToDone }}</span>
          </div>
          <div class="statRow">
            <span class="statLabel">Délai moyen NEW → IN_PROGRESS</span>
            <span class="statValue">{{ stats.avgDelayNewToInProgress }}</span>
          </div>
          <div class="statRow">
            <span class="statLabel">Délai moyen IN_PROGRESS → DONE</span>
            <span class="statValue">{{ stats.avgDelayInProgressToDone }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { api } from "../api";

type Report = {
  id: string;
  title: string;
  status: string;
  createdAt?: string | null;
  statusNewAt: string | null;
  statusInProgressAt: string | null;
  statusDoneAt: string | null;
};

type AdminUser = { id: string; email: string; locked: boolean; lockedAt: string | null; failedLoginAttempts: number };

const email = ref("");
const lockedUsers = ref<AdminUser[]>([]);
const selectedLockedId = ref<string>("");
const reports = ref<Report[]>([]);
const loading = ref(false);
const error = ref("");
const unlockOk = ref(false);
const showNotifPanel = ref(false);

const notifCounts = computed(() => {
  const list = reports.value;
  return {
    NEW: list.filter((r) => r.status === "NEW").length,
    IN_PROGRESS: list.filter((r) => r.status === "IN_PROGRESS").length,
    DONE: list.filter((r) => r.status === "DONE").length
  };
});

const recentReports = computed(() => {
  const list = [...reports.value];
  list.sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });
  return list.slice(0, 5);
});

function formatDelay(ms: number): string {
  if (ms < 0 || !Number.isFinite(ms)) return "—";
  const d = Math.floor(ms / (24 * 60 * 60 * 1000));
  const h = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  if (d > 0) return `${d} j ${h} h`;
  if (h > 0) return `${h} h`;
  const m = Math.floor(ms / (60 * 1000));
  return m > 0 ? `${m} min` : "< 1 min";
}

const stats = computed(() => {
  const list = reports.value;
  const countDone = list.filter((r) => r.status === "DONE").length;
  const newToDone: number[] = [];
  const newToInProgress: number[] = [];
  const inProgressToDone: number[] = [];
  for (const r of list) {
    const newAt = r.statusNewAt ? new Date(r.statusNewAt).getTime() : r.createdAt ? new Date(r.createdAt).getTime() : null;
    const inProgressAt = r.statusInProgressAt ? new Date(r.statusInProgressAt).getTime() : null;
    const doneAt = r.statusDoneAt ? new Date(r.statusDoneAt).getTime() : r.status === "DONE" && r.createdAt ? new Date(r.createdAt).getTime() : null;
    if (doneAt != null && newAt != null && doneAt >= newAt) newToDone.push(doneAt - newAt);
    if (inProgressAt != null && newAt != null && inProgressAt >= newAt) newToInProgress.push(inProgressAt - newAt);
    if (doneAt != null && inProgressAt != null && doneAt >= inProgressAt) inProgressToDone.push(doneAt - inProgressAt);
  }
  const avg = (arr: number[]) => (arr.length ? formatDelay(arr.reduce((a, b) => a + b, 0) / arr.length) : "—");
  return {
    countDone,
    avgDelayNewToDone: avg(newToDone),
    avgDelayNewToInProgress: avg(newToInProgress),
    avgDelayInProgressToDone: avg(inProgressToDone)
  };
});

function toNiceError(e: any, fallback: string) {
  const status = e?.response?.status;
  const msg = e?.response?.data?.message ?? e?.message ?? "";
  if (status === 404) {
    if (String(msg).toLowerCase().includes("introuvable")) return String(msg);
    return "404 (Not Found). Vérifie que le Web appelle bien /api/... (proxy) et que le backend tourne.";
  }
  return msg || fallback;
}

async function loadReports() {
  try {
    const { data } = await api.get<Report[]>("/api/reports");
    reports.value = data ?? [];
  } catch {
    // ignore
  }
}

async function loadLockedUsers() {
  try {
    const { data } = await api.get<AdminUser[]>("/api/admin/users/locked");
    lockedUsers.value = data ?? [];
    if (!selectedLockedId.value && lockedUsers.value.length > 0) {
      selectedLockedId.value = lockedUsers.value[0].id;
    }
  } catch {
    // ignore
  }
}

async function createDemoLocked() {
  unlockOk.value = false;
  error.value = "";
  loading.value = true;
  try {
    await api.post("/api/admin/users/demo-lock");
    await loadLockedUsers();
  } catch (e: any) {
    error.value = toNiceError(e, "Erreur création démo");
  } finally {
    loading.value = false;
  }
}

async function unlock() {
  unlockOk.value = false;
  error.value = "";
  loading.value = true;
  try {
    await api.post("/api/admin/users/unlock-by-email", { email: email.value });
    unlockOk.value = true;
    await loadLockedUsers();
  } catch (e: any) {
    error.value = toNiceError(e, "Erreur unlock");
  } finally {
    loading.value = false;
  }
}

async function unlockSelected() {
  unlockOk.value = false;
  error.value = "";
  if (!selectedLockedId.value) return;
  loading.value = true;
  try {
    await api.post(`/api/admin/users/${selectedLockedId.value}/unlock`);
    unlockOk.value = true;
    selectedLockedId.value = "";
    await loadLockedUsers();
  } catch (e: any) {
    error.value = toNiceError(e, "Erreur unlock");
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await loadReports();
  await loadLockedUsers();
});
</script>

<style scoped>
.managerLayout {
  display: flex;
  flex-direction: column;
  gap: 14px;
  position: relative;
}

.kpis {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.kpiCard {
  border: 1px solid rgba(15, 23, 42, 0.10);
  background: rgba(255, 255, 255, 0.70);
  border-radius: 18px;
  padding: 12px;
}

.k {
  color: rgba(15, 23, 42, 0.62);
  font-size: 12px;
  font-weight: 900;
}

.v {
  margin-top: 4px;
  font-size: 18px;
  font-weight: 900;
}

.managerTopBar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.managerTitle {
  margin: 0 0 6px 0;
  font-size: 22px;
  font-weight: 900;
  letter-spacing: -0.3px;
}

.notifWrap {
  position: relative;
  flex-shrink: 0;
}

.notifBtn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 44px;
  height: 40px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.10);
  background: rgba(255, 255, 255, 0.70);
  cursor: pointer;
}

.notifBtnActive {
  border-color: rgba(37, 99, 235, 0.20);
  background: rgba(37, 99, 235, 0.10);
}

.notifIcon {
  width: 18px;
  height: 18px;
}

.notifLabel {
  font-weight: 800;
  font-size: 12px;
}

.notifBadge {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  border-radius: 999px;
  background: rgba(225, 29, 72, 0.95);
  color: white;
  font-size: 11px;
  font-weight: 900;
  display: grid;
  place-items: center;
}

.notifBackdrop {
  position: fixed;
  inset: 0;
  z-index: 9;
  background: transparent;
}

.notifPanel {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  z-index: 10;
  min-width: 320px;
  max-width: 400px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.96);
  border-radius: 14px;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.18);
  border: 1px solid rgba(15, 23, 42, 0.08);
}

.notifPanelTitle {
  font-weight: 900;
  font-size: 14px;
  margin-bottom: 12px;
  color: rgba(15, 23, 42, 0.92);
}

.notifPanelSubtitle {
  font-size: 12px;
  font-weight: 800;
  color: rgba(15, 23, 42, 0.6);
  margin: 12px 0 6px 0;
}

.notifSummary,
.notifDelays,
.notifRecent ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.notifLine {
  font-size: 13px;
  padding: 6px 0;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  color: rgba(15, 23, 42, 0.92);
}

.notifLine:last-child {
  border-bottom: none;
}

.notifStatus {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 800;
  margin-right: 8px;
}

.notifStatus.new {
  background: rgba(225, 29, 72, 0.10);
  color: rgba(225, 29, 72, 0.95);
}

.notifStatus.progress {
  background: rgba(245, 158, 11, 0.16);
  color: rgba(180, 83, 9, 0.95);
}

.notifStatus.done {
  background: rgba(22, 163, 74, 0.10);
  color: rgba(21, 128, 61, 0.95);
}

.small {
  font-size: 12px;
  margin: 0;
}

.managerTop {
  display: grid;
  grid-template-columns: minmax(280px, 380px) minmax(260px, 1fr);
  gap: 14px;
  align-items: start;
}

@media (max-width: 780px) {
  .managerTop {
    grid-template-columns: 1fr;
  }
  .notifPanel {
    right: 0;
    left: 0;
    min-width: auto;
  }
  .kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.statsPanel {
  display: grid;
  gap: 10px;
}

.statRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}

.statRow:last-child {
  border-bottom: none;
}

.statLabel {
  color: rgba(15, 23, 42, 0.7);
  font-size: 14px;
}

.statValue {
  font-weight: 900;
  font-size: 16px;
}

.form {
  display: grid;
  gap: 10px;
}
</style>
