<template>
  <div class="managerLayout">
    <div class="managerTopBar">
      <div>
        <h2 class="managerTitle">Manager — Signalements</h2>
        <p class="muted" style="margin: 0;">Modifie les champs puis synchronise si nécessaire.</p>
      </div>

      <div class="topControls">
        <label class="muted" style="font-weight: 800;">
          Prix / m²
          <input v-model.number="pricePerM2" type="number" min="0" step="1" style="width: 140px;" />
        </label>
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

        <div class="filters">
          <label>
            Recherche
            <input v-model="q" placeholder="Titre, entreprise…" />
          </label>
          <label>
            Statut
            <select v-model="status">
              <option value="">Tous</option>
              <option value="NEW">NEW</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="DONE">DONE</option>
            </select>
          </label>
          <label>
            Type
            <select v-model="type">
              <option value="">Tous</option>
              <option value="POTHOLE">POTHOLE</option>
              <option value="ROADWORK">ROADWORK</option>
              <option value="FLOOD">FLOOD</option>
              <option value="LANDSLIDE">LANDSLIDE</option>
              <option value="OTHER">OTHER</option>
            </select>
          </label>
          <label>
            Trier
            <select v-model="sortKey">
              <option value="createdAt">Date</option>
              <option value="title">Titre</option>
              <option value="status">Statut</option>
              <option value="surfaceM2">Surface</option>
              <option value="budgetAmount">Budget</option>
            </select>
          </label>
          <label>
            Ordre
            <select v-model="sortDir">
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          </label>
          <label>
            Page
            <div class="pager">
              <button class="btn btnOutline" type="button" @click="prevPage" :disabled="page <= 1">←</button>
              <div class="pagerInfo">{{ page }} / {{ totalPages }}</div>
              <button class="btn btnOutline" type="button" @click="nextPage" :disabled="page >= totalPages">→</button>
            </div>
          </label>
        </div>

        <p v-if="syncOk" class="ok" style="margin-top: 0;">{{ syncOk }}</p>
        <p v-if="error" class="error" style="margin-top: 0;">{{ error }}</p>

        <div class="tableScroll" v-if="paged.length">
          <table class="table">
            <thead>
              <tr>
                <th>Titre</th>
                <th>Type</th>
                <th>Status</th>
                <th>Entreprise</th>
                <th>Surface (m²)</th>
                <th>Niveau</th>
                <th>Budget</th>
                <th>Avancement %</th>
                <th>Photos</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in paged" :key="r.id">
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
                <td>
                  <input v-model.number="edit[r.id].level" type="number" min="1" max="10" step="1" />
                </td>
                <td>
                  <input
                    :value="computeBudget(edit[r.id].surfaceM2, edit[r.id].level) ?? ''"
                    type="number"
                    step="1"
                    min="0"
                    disabled
                  />
                </td>
                <td>
                  <input v-model.number="edit[r.id].progressPercent" type="number" step="1" min="0" max="100" disabled />
                </td>
                <td class="photosCell">
                  <template v-if="(r.photoUrls?.length ?? 0) > 0">
                    <template v-for="(url, idx) in (r.photoUrls ?? [])" :key="idx">
                      <a :href="url" target="_blank" rel="noreferrer" class="photoLink">Photo {{ idx + 1 }}</a
                      ><span v-if="idx < (r.photoUrls?.length ?? 0) - 1" class="photoSep"> · </span>
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
import { computed, onMounted, ref, watch } from "vue";
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
  level?: number | null;
  progressPercent: number | null;
  createdAt?: string | null;
  statusNewAt?: string | null;
  statusInProgressAt?: string | null;
  statusDoneAt?: string | null;
};

type EditRow = {
  status: string;
  type: string;
  companyName: string;
  surfaceM2: number | null;
  level: number | null;
  progressPercent: number | null;
};

const reports = ref<Report[]>([]);
const edit = ref<Record<string, EditRow>>({});
const loading = ref(false);
const error = ref("");
const syncOk = ref("");

const pricePerM2 = ref<number>(Number(localStorage.getItem("pricePerM2") ?? 1000));

watch(pricePerM2, (v) => {
  const n = Number(v);
  localStorage.setItem("pricePerM2", String(Number.isFinite(n) && n >= 0 ? n : 0));
});

function clampLevel(v: any): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 1;
  return Math.min(10, Math.max(1, Math.round(n)));
}

function computeBudget(surfaceM2: number | null, level: number | null): number | null {
  const s = Number(surfaceM2);
  const p = Number(pricePerM2.value);
  const lv = Number(level);
  if (!Number.isFinite(s) || s <= 0) return null;
  if (!Number.isFinite(p) || p < 0) return null;
  if (!Number.isFinite(lv) || lv <= 0) return null;
  return Math.round(p * lv * s);
}

const q = ref("");
const status = ref("");
const type = ref("");

const sortKey = ref<"createdAt" | "title" | "status" | "surfaceM2" | "budgetAmount">("createdAt");
const sortDir = ref<"asc" | "desc">("desc");

const page = ref(1);
const pageSize = ref(12);

const filtered = computed(() => {
  const qq = q.value.trim().toLowerCase();
  const st = status.value.trim().toUpperCase();
  const tp = type.value.trim().toUpperCase();
  return reports.value.filter((r) => {
    if (st && String(r.status).toUpperCase() !== st) return false;
    if (tp && String(r.type ?? "").toUpperCase() !== tp) return false;
    if (!qq) return true;
    const hay = `${r.title ?? ""} ${(r.companyName ?? "")}`.toLowerCase();
    return hay.includes(qq);
  });
});

const sorted = computed(() => {
  const dir = sortDir.value;
  const key = sortKey.value;
  const factor = dir === "asc" ? 1 : -1;

  const getNum = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const getTime = (r: Report) => {
    const iso = r.statusDoneAt || r.statusInProgressAt || r.statusNewAt || r.createdAt || null;
    const t = iso ? new Date(iso).getTime() : 0;
    return Number.isFinite(t) ? t : 0;
  };

  const list = [...filtered.value];
  list.sort((a, b) => {
    let va: any;
    let vb: any;
    if (key === "createdAt") {
      va = getTime(a);
      vb = getTime(b);
      return (va - vb) * factor;
    }
    if (key === "surfaceM2") {
      va = getNum(a.surfaceM2);
      vb = getNum(b.surfaceM2);
      return (va - vb) * factor;
    }
    if (key === "budgetAmount") {
      va = getNum(a.budgetAmount);
      vb = getNum(b.budgetAmount);
      return (va - vb) * factor;
    }
    if (key === "status") {
      va = String(a.status ?? "").toUpperCase();
      vb = String(b.status ?? "").toUpperCase();
      return va.localeCompare(vb) * factor;
    }
    va = String(a.title ?? "");
    vb = String(b.title ?? "");
    return va.localeCompare(vb) * factor;
  });
  return list;
});

const totalPages = computed(() => {
  const n = sorted.value.length;
  const ps = Math.max(1, pageSize.value);
  return Math.max(1, Math.ceil(n / ps));
});

const paged = computed(() => {
  const ps = Math.max(1, pageSize.value);
  const p = Math.min(Math.max(1, page.value), totalPages.value);
  const start = (p - 1) * ps;
  return sorted.value.slice(start, start + ps);
});

function prevPage() {
  page.value = Math.max(1, page.value - 1);
}

function nextPage() {
  page.value = Math.min(totalPages.value, page.value + 1);
}

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

async function refresh() {
  error.value = "";
  syncOk.value = "";
  loading.value = true;
  try {
    const { data } = await api.get<Report[]>("/api/reports");
    reports.value = data;
    const next: Record<string, EditRow> = {};
    for (const r of data) {
      next[r.id] = {
        status: r.status,
        type: (r.type ?? "OTHER") as string,
        companyName: (r.companyName ?? "") as string,
        surfaceM2: r.surfaceM2 ?? null,
        level: r.level ?? 1,
        progressPercent: r.progressPercent ?? null
      };
    }
    edit.value = next;
    page.value = 1;
  } catch (e: any) {
    error.value = toNiceError(e, "Erreur chargement signalements");
  } finally {
    loading.value = false;
  }
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
  loading.value = true;
  try {
    const row = edit.value[id];
    const level = row.level != null ? clampLevel(row.level) : null;
    const budgetAmount = computeBudget(row.surfaceM2, level);
    await api.patch(`/api/reports/${id}`, {
      status: row.status,
      type: row.type,
      companyName: row.companyName,
      surfaceM2: row.surfaceM2,
      budgetAmount,
      level,
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
});
</script>

<style scoped>
.managerLayout {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.managerTopBar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.topControls {
  display: flex;
  gap: 10px;
  align-items: center;
}

.topControls input {
  margin-left: 8px;
}

.managerTitle {
  margin: 0 0 6px 0;
  font-size: 22px;
  font-weight: 900;
  letter-spacing: -0.3px;
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

.filters {
  display: grid;
  grid-template-columns: 1fr 220px 180px 180px 140px 260px;
  gap: 10px;
  margin-bottom: 10px;
}

@media (max-width: 820px) {
  .filters {
    grid-template-columns: 1fr;
  }
}

.pager {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pagerInfo {
  min-width: 70px;
  text-align: center;
  font-weight: 900;
  color: rgba(15, 23, 42, 0.70);
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

.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
