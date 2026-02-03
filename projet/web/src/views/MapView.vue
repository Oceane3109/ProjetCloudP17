<template>
  <div class="grid2" style="grid-template-columns: 380px 1fr;">
    <div class="card">
      <div class="cardHeader">
        <h2 class="h1">Carte</h2>
        <p class="muted">Backend (Postgres) — pour voir les données du mobile: <b>Firebase → Backend (pull)</b> dans Manager.</p>
      </div>
      <div class="cardBody">
        <p class="muted">
          Source tuiles: <code>{{ tileUrl }}</code>
        </p>
        <button class="btn btnOutline" @click="refresh" :disabled="loading">{{ loading ? "..." : "Rafraîchir" }}</button>

      <div class="stats">
        <div class="stat">
          <div class="k">Points</div>
          <div class="v">{{ reports.length }}</div>
        </div>
        <div class="stat">
          <div class="k">Surface totale (m²)</div>
          <div class="v">{{ formatNumber(totalSurfaceM2) }}</div>
        </div>
        <div class="stat">
          <div class="k">Budget total</div>
          <div class="v">{{ formatMoney(totalBudget) }}</div>
        </div>
        <div class="stat">
          <div class="k">Avancement moyen</div>
          <div class="v">{{ avgProgress }}%</div>
        </div>
      </div>

      <div class="badges">
        <span class="badge">NEW: {{ countByStatus("NEW") }}</span>
        <span class="badge">IN_PROGRESS: {{ countByStatus("IN_PROGRESS") }}</span>
        <span class="badge">DONE: {{ countByStatus("DONE") }}</span>
      </div>

      <p class="muted small">Astuce: survole un point pour voir les détails.</p>
      <p v-if="error" class="error">{{ error }}</p>
    </div>
    </div>
    <div class="card mapWrap">
      <div ref="mapEl" class="map"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import L from "leaflet";
import { api } from "../api";

type Report = {
  id: string;
  userId: string | null;
  title: string;
  description: string | null;
  latitude: number;
  longitude: number;
  status: string;
  surfaceM2: number | null;
  budgetAmount: number | null;
  progressPercent: number | null;
  createdAt: string;
};

const mapEl = ref<HTMLDivElement | null>(null);
const reports = ref<Report[]>([]);
const error = ref("");
const loading = ref(false);

// Offline tiles (si service maps lancé): http://localhost:8081/tile/{z}/{x}/{y}.png
const tileUrl =
  (import.meta.env.VITE_OSM_TILE_URL as string | undefined) ??
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

let map: L.Map | null = null;
let layerGroup: L.LayerGroup | null = null;

async function loadReports() {
  const { data } = await api.get<Report[]>("/api/reports");
  reports.value = data;
}

async function refresh() {
  error.value = "";
  loading.value = true;
  try {
    await loadReports();
    renderMarkers();
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? "Erreur chargement signalements";
  } finally {
    loading.value = false;
  }
}

const totalSurfaceM2 = computed(() =>
  reports.value.reduce((sum, r) => sum + (r.surfaceM2 ?? 0), 0)
);
const totalBudget = computed(() =>
  reports.value.reduce((sum, r) => sum + (r.budgetAmount ?? 0), 0)
);
const avgProgress = computed(() => {
  const vals = reports.value.map((r) => r.progressPercent).filter((v): v is number => v != null);
  if (!vals.length) return 0;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
});

function countByStatus(s: string) {
  return reports.value.filter((r) => r.status === s).length;
}

function renderMarkers() {
  if (!map || !layerGroup) return;
  layerGroup.clearLayers();

  // Si plusieurs points ont la même position, ils se superposent.
  // On applique un petit "jitter" visuel (sans changer les données).
  const groups = new Map<string, Report[]>();
  for (const r of reports.value) {
    const key = `${r.latitude.toFixed(6)}|${r.longitude.toFixed(6)}`;
    const arr = groups.get(key) ?? [];
    arr.push(r);
    groups.set(key, arr);
  }

  const jittered = new Map<string, [number, number]>();
  for (const arr of groups.values()) {
    if (arr.length <= 1) continue;
    const sorted = [...arr].sort((a, b) => a.id.localeCompare(b.id));
    const baseLat = sorted[0].latitude;
    const baseLng = sorted[0].longitude;
    const radiusLat = 0.00012; // ~13m
    const latRad = (baseLat * Math.PI) / 180;
    for (let i = 0; i < sorted.length; i++) {
      const angle = (2 * Math.PI * i) / sorted.length;
      const dLat = radiusLat * Math.cos(angle);
      const dLng = (radiusLat * Math.sin(angle)) / Math.max(0.2, Math.cos(latRad));
      jittered.set(sorted[i].id, [baseLat + dLat, baseLng + dLng]);
    }
  }

  for (const r of reports.value) {
    const pos = jittered.get(r.id) ?? [r.latitude, r.longitude];
    const m = L.marker(pos as any);
    // Détails au survol (tooltip)
    m.bindTooltip(
      `<b>${escapeHtml(r.title)}</b><br/>Status: ${escapeHtml(r.status)}<br/>Surface: ${
        r.surfaceM2 ?? "-"
      } m²<br/>Budget: ${r.budgetAmount ?? "-"}<br/>Avancement: ${r.progressPercent ?? "-"}%`,
      { direction: "top", sticky: true, opacity: 0.95 }
    );
    m.bindPopup(
      `<b>${escapeHtml(r.title)}</b><br/>Status: ${escapeHtml(r.status)}<br/>${escapeHtml(
        r.description ?? ""
      )}`
    );
    m.addTo(layerGroup);
  }
}

function escapeHtml(s: string) {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function formatNumber(n: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n);
}

function formatMoney(n: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "MGA",
    maximumFractionDigits: 0
  }).format(n);
}

onMounted(async () => {
  await refresh();

  if (!mapEl.value) return;
  map = L.map(mapEl.value).setView([-18.8792, 47.5079], 13); // Antananarivo approx
  L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(map);
  layerGroup = L.layerGroup().addTo(map);
  renderMarkers();
});

onBeforeUnmount(() => {
  map?.remove();
  map = null;
  layerGroup = null;
});
</script>

<style scoped>
.stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.stat {
  border: 1px solid rgba(15, 23, 42, 0.10);
  border-radius: 14px;
  padding: 10px;
  background: rgba(15, 23, 42, 0.03);
}
.k {
  color: rgba(15, 23, 42, 0.62);
  font-size: 12px;
}
.v {
  font-size: 20px;
  font-weight: 700;
}
.badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 10px;
}
.badge {
  border: 1px solid rgba(15, 23, 42, 0.10);
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 12px;
  background: rgba(15, 23, 42, 0.04);
}
.small {
  font-size: 12px;
}
.mapWrap {
  overflow: hidden;
}
.map {
  height: calc(100vh - 120px);
  min-height: 520px;
}
</style>

