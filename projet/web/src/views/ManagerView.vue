<template>
  <div class="grid2">
    <div class="card">
      <div class="cardHeader">
        <h2 class="h1">Manager</h2>
        <p class="muted">Renseigne surface/budget/avancement puis fais un <b>push</b> pour que le mobile voie les changements.</p>
      </div>
      <div class="cardBody">
        <h3 class="h1">Débloquer utilisateur</h3>

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
        <h3 class="h1">Signalements</h3>
      </div>
      <div class="cardBody">
        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:10px;">
          <button class="btn btnOutline" @click="refresh" :disabled="loading">Rafraîchir</button>
          <button class="btn btnOutline" @click="firebasePull" :disabled="loading">Firebase → Backend (pull)</button>
          <button class="btn btnPrimary" @click="firebasePush" :disabled="loading">Backend → Firebase (push)</button>
        </div>

        <table class="table" v-if="reports.length">
        <thead>
          <tr>
            <th>Titre</th>
            <th>Status</th>
            <th>Surface (m²)</th>
            <th>Budget</th>
            <th>Avancement %</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in reports" :key="r.id">
            <td>{{ r.title }}</td>
            <td>
              <select v-model="edit[r.id].status">
                <option value="NEW">NEW</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="DONE">DONE</option>
              </select>
            </td>
            <td><input v-model.number="edit[r.id].surfaceM2" type="number" step="0.01" min="0" /></td>
            <td><input v-model.number="edit[r.id].budgetAmount" type="number" step="0.01" min="0" /></td>
            <td><input v-model.number="edit[r.id].progressPercent" type="number" step="1" min="0" max="100" /></td>
            <td class="actions">
              <button class="btn btnOutline" @click="save(r.id)" :disabled="loading">Enregistrer</button>
              <button class="btn btnDanger" @click="remove(r.id)" :disabled="loading">Supprimer</button>
            </td>
          </tr>
        </tbody>
        </table>
        <p class="muted" v-else>Aucun signalement.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { api } from "../api";

type Report = {
  id: string;
  title: string;
  status: string;
  surfaceM2: number | null;
  budgetAmount: number | null;
  progressPercent: number | null;
};
type EditRow = {
  status: string;
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
    syncOk.value = `Pull OK: ${data.processed} docs (created ${data.created}, updated ${data.updated}, skipped ${data.skipped})`;
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
    syncOk.value = `Push OK: ${data.processed} reports (updated ${data.updated}, skipped ${data.skipped})`;
  } catch (e: any) {
    error.value = toNiceError(e, "Erreur Firebase push");
  } finally {
    loading.value = false;
  }
}

async function save(id: string) {
  error.value = "";
  loading.value = true;
  try {
    const row = edit.value[id];
    await api.patch(`/api/reports/${id}`, {
      status: row.status,
      surfaceM2: row.surfaceM2,
      budgetAmount: row.budgetAmount,
      progressPercent: row.progressPercent
    });
    await refresh();
  } catch (e: any) {
    error.value = toNiceError(e, "Erreur modification");
  } finally {
    loading.value = false;
  }
}

async function remove(id: string) {
  error.value = "";
  loading.value = true;
  try {
    await api.delete(`/api/reports/${id}`);
    await refresh();
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

