<template>
  <div class="managerLayout">
    <div class="managerTopBar">
      <div>
        <h2 class="managerTitle">Manager</h2>
        <p class="muted" style="margin: 0;">Renseigne surface/budget/avancement puis fais un <b>push</b> pour que le mobile voie les changements.</p>
      </div>

      <div class="managerTopActions">
        <div class="notifWrap">
          <button type="button" class="notifBtn" :class="{ notifBtnActive: showNotifPanel }" @click="showNotifPanel = !showNotifPanel" :aria-label="'Notifications'" title="Notifications et détails des signalements">
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
                  <span class="notifStatus" :class="{ new: r.status === 'NEW', progress: r.status === 'IN_PROGRESS', done: r.status === 'DONE' }">{{ r.status }}</span>
                  {{ r.title }}
                </li>
              </ul>
            </div>
            <p v-else class="muted small">Aucun signalement.</p>
          </div>
        </div>
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

          <div class="form" style="margin-bottom:12px;">
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
          <p v-if="syncOk" class="ok">{{ syncOk }}</p>
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

    <div class="card managerTableCard">
      <div class="cardHeader">
        <h3 class="h1">Signalements</h3>
        <p class="muted">Les photos apparaissent dans la colonne <b>Photos</b> quand un signalement est créé depuis l’app mobile (avec pièces jointes) ou après un <b>Firebase → Backend (pull)</b>.</p>
      </div>
      <div class="cardBody tableWrapper">
        <div class="toolbar">
          <button class="btn btnOutline" @click="refresh" :disabled="loading">Rafraîchir</button>
          <button class="btn btnOutline" @click="firebasePull" :disabled="loading">Firebase → Backend (pull)</button>
          <button class="btn btnPrimary" @click="firebasePush" :disabled="loading">Backend → Firebase (push)</button>
        </div>

        <div class="tableScroll" v-if="reports.length">
        <table class="table">
        <thead>
          <tr>
            <th>Titre</th>
            <th>Type</th>
            <th>Status</th>
            <th>Entreprise</th>
            <th>Surface (m²)</th>
            <th>Budget</th>
            <th>Avancement %</th>
            <th>Photos</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in reports" :key="r.id">
            <td>{{ r.title }}</td>
            <td>
              <select v-model="edit[r.id].type">
                <option value="POTHOLE">Trou</option>
                <option value="ROADWORK">Travaux</option>
                <option value="FLOOD">Inondation</option>
                <option value="LANDSLIDE">Éboulement</option>
                <option value="OTHER">Autre</option>
              </select>
            </td>
            <td>
              <select v-model="edit[r.id].status">
                <option value="NEW">NEW</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="DONE">DONE</option>
              </select>
            </td>
            <td><input v-model="edit[r.id].companyName" placeholder="Entreprise" /></td>
            <td><input v-model.number="edit[r.id].surfaceM2" type="number" step="0.01" min="0" /></td>
            <td><input v-model.number="edit[r.id].budgetAmount" type="number" step="0.01" min="0" /></td>
            <td>
              <input v-model.number="edit[r.id].progressPercent" type="number" step="1" min="0" max="100" disabled />
            </td>
            <td class="photosCell">
              <template v-if="(r.photoUrls?.length ?? 0) > 0">
                <template v-for="(url, idx) in (r.photoUrls ?? [])" :key="idx">
                  <a
                    :href="url"
                    target="_blank"
                    rel="noreferrer"
                    class="photoLink"
                  >Photo {{ idx + 1 }}</a><span v-if="idx < (r.photoUrls?.length ?? 0) - 1" class="photoSep"> · </span>
                </template>
              </template>
              <span v-else class="muted">— (upload depuis l’app mobile)</span>
            </td>
            <td class="actions">
              <button class="btn btnOutline" @click="save(r.id)" :disabled="loading">Enregistrer</button>
              <button class="btn btnDanger" @click="remove(r.id)" :disabled="loading">Supprimer</button>
            </td>
          </tr>
        </tbody>
        </table>
        </div>
        <p v-else class="muted">Aucun signalement.</p>
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
  type?: string;
  companyName?: string | null;
  photoUrls?: string[];
  surfaceM2: number | null;
  budgetAmount: number | null;
  progressPercent: number | null;
  createdAt?: string | null;
  statusNewAt: string | null;
  statusInProgressAt: string | null;
  statusDoneAt: string | null;
};
type EditRow = {
  status: string;
  type: string;
  companyName: string;
  surfaceM2: number | null;
  budgetAmount: number | null;
  progressPercent: number | null;
};

const email = ref("");
type AdminUser = { id: string; email: string; locked: boolean; lockedAt: string | null; failedLoginAttempts: number };
const lockedUsers = ref<AdminUser[]>([]);
const selectedLockedId = ref<string>("");
const reports = ref<Report[]>([]);
const edit = ref<Record<string, EditRow>>({});
const loading = ref(false);
const error = ref("");
const unlockOk = ref(false);
const syncOk = ref("");
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
    const newAt = r.statusNewAt ? new Date(r.statusNewAt).getTime() : (r.createdAt ? new Date(r.createdAt).getTime() : null);
    const inProgressAt = r.statusInProgressAt ? new Date(r.statusInProgressAt).getTime() : null;
    const doneAt = r.statusDoneAt ? new Date(r.statusDoneAt).getTime() : (r.status === "DONE" && r.createdAt ? new Date(r.createdAt).getTime() : null);
    if (doneAt != null && newAt != null && doneAt >= newAt) {
      newToDone.push(doneAt - newAt);
    }
    if (inProgressAt != null && newAt != null && inProgressAt >= newAt) {
      newToInProgress.push(inProgressAt - newAt);
    }
    if (doneAt != null && inProgressAt != null && doneAt >= inProgressAt) {
      inProgressToDone.push(doneAt - inProgressAt);
    }
  }
  const avg = (arr: number[]) =>
    arr.length ? formatDelay(arr.reduce((a, b) => a + b, 0) / arr.length) : "—";
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
  if (status === 400 && String(msg).includes("app.firebase.enabled=false")) {
    return (
      "Firebase sync désactivée (app.firebase.enabled=false). Active Firebase côté backend " +
      "(service account + app.firebase.enabled=true) puis rebuild Docker."
    );
  }
  return msg || fallback;
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

async function loadLockedUsers() {
  try {
    const { data } = await api.get<AdminUser[]>("/api/admin/users/locked");
    lockedUsers.value = data ?? [];
    if (!selectedLockedId.value && lockedUsers.value.length > 0) {
      selectedLockedId.value = lockedUsers.value[0].id;
    }
  } catch (e: any) {
    // non bloquant
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

async function refresh() {
  const { data } = await api.get<Report[]>("/api/reports");
  reports.value = data;
  const next: Record<string, EditRow> = {};
  for (const r of data) {
    next[r.id] = {
      status: r.status,
      type: (r.type ?? "OTHER") as string,
      companyName: (r.companyName ?? "") as string,
      surfaceM2: r.surfaceM2 ?? null,
      budgetAmount: r.budgetAmount ?? null,
      progressPercent: r.progressPercent ?? null
    };
  }
  edit.value = next;
}

async function firebasePull() {
  error.value = "";
  syncOk.value = "";
  loading.value = true;
  try {
    const { data } = await api.post("/api/admin/sync/firebase/reports/pull");
    syncOk.value = `Pull OK: ${data.processed} docs (created ${data.created}, updated ${data.updated}, deleted ${data.deleted}, skipped ${data.skipped})`;
    await refresh();
  } catch (e: any) {
    error.value = toNiceError(e, "Erreur Firebase pull");
  } finally {
    loading.value = false;
  }
}

async function firebasePush() {
  error.value = "";
  syncOk.value = "";
  loading.value = true;
  try {
    const { data } = await api.post("/api/admin/sync/firebase/reports/push");
    syncOk.value = `Push OK: ${data.processed} docs (created ${data.created}, updated ${data.updated}, deleted ${data.deleted}, skipped ${data.skipped})`;
  } catch (e: any) {
    error.value = toNiceError(e, "Erreur Firebase push");
  } finally {
    loading.value = false;
  }
}

async function save(id: string) {
  error.value = "";
  syncOk.value = "";
  loading.value = true;
  try {
    const row = edit.value[id];
    await api.patch(`/api/reports/${id}`, {
      status: row.status,
      type: row.type,
      companyName: row.companyName,
      surfaceM2: row.surfaceM2,
      budgetAmount: row.budgetAmount,
      progressPercent: row.progressPercent
    });
    await refresh();
    // Auto-push vers Firebase pour que le mobile reçoive la mise à jour
    try {
      const { data } = await api.post("/api/admin/sync/firebase/reports/push");
      syncOk.value = `Push auto OK (${data.updated} mis à jour)`;
    } catch {
      // non bloquant : la sauvegarde backend a réussi
    }
  } catch (e: any) {
    error.value = toNiceError(e, "Erreur modification");
  } finally {
    loading.value = false;
  }
}

async function remove(id: string) {
  error.value = "";
  syncOk.value = "";
  loading.value = true;
  try {
    await api.delete(`/api/reports/${id}`);
    await refresh();
    // Auto-push vers Firebase pour supprimer aussi côté mobile
    try {
      await api.post("/api/admin/sync/firebase/reports/push");
    } catch {
      // non bloquant
    }
  } catch (e: any) {
    error.value = toNiceError(e, "Erreur suppression");
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await refresh();
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
.managerHeader {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
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
  height: 44px;
  padding: 0 14px;
  border: 1px solid rgba(15, 23, 42, 0.15);
  border-radius: 12px;
  background: rgba(59, 130, 246, 0.08);
  cursor: pointer;
  color: #0f172a;
}
.notifBtn:hover {
  background: rgba(59, 130, 246, 0.15);
  border-color: rgba(59, 130, 246, 0.35);
}
.notifBtn:focus-visible {
  outline: 2px solid rgba(59, 130, 246, 0.5);
  outline-offset: 2px;
}
.notifBtnActive {
  background: rgba(59, 130, 246, 0.2) !important;
  border-color: rgba(59, 130, 246, 0.5) !important;
}
.notifIcon {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}
.notifLabel {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
}
.notifBadge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  background: #ef4444;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
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
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.18);
  border: 1px solid rgba(15, 23, 42, 0.08);
}
.notifPanelTitle {
  font-weight: 700;
  font-size: 14px;
  margin-bottom: 12px;
  color: #0f172a;
}
.notifPanelSubtitle {
  font-size: 12px;
  font-weight: 600;
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
  color: #0f172a;
}
.notifLine:last-child {
  border-bottom: none;
}
.notifStatus {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  margin-right: 8px;
}
.notifStatus.new {
  background: rgba(239, 68, 68, 0.15);
  color: #b91c1c;
}
.notifStatus.progress {
  background: rgba(245, 158, 11, 0.2);
  color: #b45309;
}
.notifStatus.done {
  background: rgba(34, 197, 94, 0.15);
  color: #15803d;
}
.notifRecent li {
  font-size: 13px;
  padding: 6px 0;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
}
.notifRecent li:last-child {
  border-bottom: none;
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
}
.managerTableCard {
  width: 100%;
  min-width: 0;
}
.tableWrapper {
  min-width: 0;
}
.toolbar {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.tableScroll {
  overflow-x: auto;
  margin: 0 -14px 0 0;
  padding-right: 14px;
}
.table {
  min-width: 900px;
}
.photosCell {
  white-space: nowrap;
}
.photoLink {
  font-size: 13px;
}
.photoSep {
  color: rgba(15, 23, 42, 0.5);
  font-size: 12px;
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
  font-weight: 700;
  font-size: 16px;
}
.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.form {
  display: grid;
  gap: 10px;
}
</style>

