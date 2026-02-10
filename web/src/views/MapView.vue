<template>
  <div class="mapDash">
    <div class="mapTop">
      <div>
        <h2 class="mapTitle">Carte</h2>
        <p class="muted" style="margin: 0;">
          Backend (Postgres) — pour voir les données du mobile: <b>Firebase → Backend (pull)</b> dans Manager.
        </p>
      </div>
      <div class="mapActions">
        <button class="btn btnOutline" @click="refresh" :disabled="loading">{{ loading ? "..." : "Rafraîchir" }}</button>
      </div>
    </div>

    <div class="kpis">
      <div class="kpiCard">
        <div class="k">Points</div>
        <div class="v">{{ reports.length }}</div>
      </div>
      <div class="kpiCard">
        <div class="k">Surface totale</div>
        <div class="v">{{ formatNumber(totalSurfaceM2) }} <span class="u">m²</span></div>
      </div>
      <div class="kpiCard">
        <div class="k">Budget total</div>
        <div class="v">{{ formatMoney(totalBudget) }}</div>
      </div>
      <div class="kpiCard">
        <div class="k">Avancement moyen</div>
        <div class="v">{{ avgProgress }}<span class="u">%</span></div>
      </div>
    </div>

    <div class="mapGrid">
      <div class="card sidePanel">
        <div class="cardHeader">
          <h3 class="h1">Statuts</h3>
        </div>
        <div class="cardBody">
          <div class="statusPills">
            <span class="statusPill new">NEW <b>{{ countByStatus("NEW") }}</b></span>
            <span class="statusPill progress">IN_PROGRESS <b>{{ countByStatus("IN_PROGRESS") }}</b></span>
            <span class="statusPill done">DONE <b>{{ countByStatus("DONE") }}</b></span>
          </div>

          <div class="divider"></div>

          <p class="muted" style="margin-top: 0;">
            Source tuiles:
            <code class="tileCode">{{ tileUrl }}</code>
          </p>
          <p class="muted small" style="margin-bottom: 0;">Astuce: survole un point pour voir les détails.</p>
          <p v-if="error" class="error" style="margin-bottom: 0;">{{ error }}</p>
        </div>
      </div>

      <div class="card mapFrame">
        <div ref="mapEl" class="map"></div>
      </div>
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
  type: string;
  title: string;
  description: string | null;
  latitude: number;
  longitude: number;
  status: string;
  companyName: string | null;
  photoUrls: string[];
  surfaceM2: number | null;
  budgetAmount: number | null;
  level?: number | null;
  progressPercent: number | null;
  createdAt: string;
  statusNewAt: string | null;
  statusInProgressAt: string | null;
  statusDoneAt: string | null;
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

function iconFor(report: { status: string; type?: string; title?: string }) {
  const s = (report.status || "").toUpperCase();
  const statusColor = s === "DONE" ? "#22c55e" : s === "IN_PROGRESS" ? "#f59e0b" : "#ef4444"; // NEW default

  const t = ((report.type || "") + " " + (report.title || "")).toUpperCase();
  const type =
    t.includes("FLOOD") || t.includes("INOND") ? "FLOOD" :
    t.includes("LANDSLIDE") || t.includes("EBOUL") || t.includes("ECROUL") || t.includes("GLISS") ? "LANDSLIDE" :
    t.includes("ROADWORK") || t.includes("TRAVAUX") || t.includes("CHANTIER") ? "ROADWORK" :
    t.includes("POTHOLE") || t.includes("TROU") || t.includes("NID") ? "POTHOLE" :
    "OTHER";

  const color =
    type === "POTHOLE" ? "#ef4444" :
    type === "ROADWORK" ? "#f59e0b" :
    type === "FLOOD" ? "#3b82f6" :
    type === "LANDSLIDE" ? "#a855f7" :
    "#64748b";

  const glyph =
    type === "POTHOLE"
      ? `<circle cx="19" cy="18" r="4.6" fill="#0f172a"/><path d="M15.5 18.5 L22.5 17" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round"/>`
      : type === "ROADWORK"
      ? `<path d="M14 23 h10 a2 2 0 0 0 2-2 v-6 a2 2 0 0 0-2-2 h-10 a2 2 0 0 0-2 2 v6 a2 2 0 0 0 2 2z" fill="#0f172a"/><path d="M13.5 16.5 L24.5 21.5" stroke="#ffffff" stroke-width="1.4"/><path d="M13.5 19.5 L21.5 23" stroke="#ffffff" stroke-width="1.4"/>`
      : type === "FLOOD"
      ? `<path d="M13 20 c2 2 4 2 6 0 s4-2 6 0" fill="none" stroke="#0f172a" stroke-width="1.6" stroke-linecap="round"/><path d="M13 16 c2 2 4 2 6 0 s4-2 6 0" fill="none" stroke="#0f172a" stroke-width="1.6" stroke-linecap="round"/>`
      : type === "LANDSLIDE"
      ? `<path d="M13 23 L18.5 13 L25 23 Z" fill="#0f172a"/><circle cx="14.5" cy="15.5" r="1.2" fill="#0f172a"/><circle cx="12.8" cy="18" r="1.1" fill="#0f172a"/><circle cx="11.8" cy="20.5" r="1.0" fill="#0f172a"/>`
      : `<path d="M19 13 a5 5 0 1 0 0.001 0z" fill="#0f172a"/><path d="M19 16 v4" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round"/><circle cx="19" cy="22" r="1.1" fill="#ffffff"/>`;

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="34" height="46" viewBox="0 0 34 46">
    <path d="M17 45C17 45 2 28.5 2 18C2 8.6 9.6 1 19 1C28.4 1 32 8.6 32 18C32 28.5 17 45 17 45Z"
          fill="${color}" stroke="rgba(15,23,42,0.35)" stroke-width="1.5"/>
    <circle cx="19" cy="18" r="6" fill="white" fill-opacity="0.95"/>
    <circle cx="28" cy="10" r="4" fill="${statusColor}" stroke="white" stroke-width="1.5"/>
    ${glyph}
  </svg>
  `.trim();

  const url = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  return L.icon({
    iconUrl: url,
    iconSize: [34, 46],
    iconAnchor: [19, 45],
    popupAnchor: [0, -40],
    tooltipAnchor: [10, -28]
  });
}

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
  const vals = reports.value
    .map((r) => (r.progressPercent != null ? r.progressPercent : r.status === "DONE" ? 100 : r.status === "IN_PROGRESS" ? 50 : 0))
    .filter((v): v is number => v != null);
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
    const m = L.marker(pos as any, { icon: iconFor(r as any) });
    const tooltipHtml = buildMarkerTooltip(r);
    const popupHtml = buildMarkerPopup(r);
    m.bindTooltip(tooltipHtml, { direction: "top", sticky: true, opacity: 0.95 });
    m.bindPopup(popupHtml);
    m.addTo(layerGroup);
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      dateStyle: "short",
      timeStyle: "short"
    });
  } catch {
    return "—";
  }
}

function buildMarkerTooltip(r: Report): string {
  const statusLabel = r.status === "DONE" ? "terminé" : r.status === "IN_PROGRESS" ? "en cours" : "nouveau";
  const urls = r.photoUrls ?? [];
  const photos =
    urls.length > 0
      ? urls
          .map((u, i) => `<a href="${escapeHtml(u)}" target="_blank" rel="noreferrer">Photo ${i + 1}</a>`)
          .join(" · ")
      : "—";

  const parts = [
    `<b>${escapeHtml(r.title)}</b>`,
    `Date: ${formatDate(r.createdAt)}`,
    `Statut: ${escapeHtml(statusLabel)}`,
    `Surface: ${r.surfaceM2 ?? "—"} m²`,
    `Budget: ${r.budgetAmount != null ? formatMoney(r.budgetAmount) : "—"}`,
    r.companyName ? `Entreprise: ${escapeHtml(r.companyName)}` : null,
    `Niveau: ${r.level ?? "—"}`,
    `Photos: ${photos}`
  ].filter(Boolean);
  return parts.join("<br/>");
}

function buildMarkerPopup(r: Report): string {
  const parts = [
    `<b>${escapeHtml(r.title)}</b>`,
    `Type: ${escapeHtml(r.type)} · Statut: ${escapeHtml(r.status)}`,
    r.companyName ? `Entreprise: ${escapeHtml(r.companyName)}` : null,
    r.description ? escapeHtml(r.description) : null,
    `Surface: ${r.surfaceM2 ?? "—"} m² · Niveau: ${r.level ?? "—"} · Budget: ${r.budgetAmount != null ? formatMoney(r.budgetAmount) : "—"} · Avancement: ${r.progressPercent ?? "—"}%`,
    "<br/><b>Dates statut</b>: NEW " + formatDate(r.statusNewAt) + " → IN_PROGRESS " + formatDate(r.statusInProgressAt) + " → DONE " + formatDate(r.statusDoneAt)
  ].filter(Boolean);
  let html = parts.join("<br/>");
  const urls = r.photoUrls ?? [];
  if (urls.length > 0) {
    html += "<br/><b>Photos</b>: ";
    html += urls
      .map((url, i) => `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">Photo ${i + 1}</a>`)
      .join(" · ");
  }
  return html;
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
  .mapDash {
    display: grid;
    gap: 14px;
  }

  .mapTop {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .mapTitle {
    margin: 0 0 6px 0;
    font-size: 22px;
    font-weight: 900;
    letter-spacing: -0.3px;
  }

  .mapActions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
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
    font-weight: 800;
  }

  .v {
    margin-top: 4px;
    font-size: 20px;
    font-weight: 900;
  }

  .u {
    font-size: 12px;
    color: rgba(15, 23, 42, 0.52);
    margin-left: 4px;
    font-weight: 800;
  }

  .mapGrid {
    display: grid;
    gap: 14px;
    grid-template-columns: 360px 1fr;
    align-items: start;
  }

  .sidePanel {
    position: sticky;
    top: 14px;
  }

  .statusPills {
    display: grid;
    gap: 10px;
  }

  .statusPill {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-radius: 14px;
    border: 1px solid rgba(15, 23, 42, 0.10);
    background: rgba(255, 255, 255, 0.70);
    font-weight: 900;
    letter-spacing: 0.2px;
  }

  .statusPill b {
    font-size: 14px;
  }

  .statusPill.new {
    border-color: rgba(225, 29, 72, 0.18);
    background: rgba(225, 29, 72, 0.06);
  }

  .statusPill.progress {
    border-color: rgba(245, 158, 11, 0.22);
    background: rgba(245, 158, 11, 0.08);
  }

  .statusPill.done {
    border-color: rgba(22, 163, 74, 0.18);
    background: rgba(22, 163, 74, 0.06);
  }

  .divider {
    height: 1px;
    background: rgba(15, 23, 42, 0.10);
    margin: 12px 0;
  }

  .tileCode {
    display: inline-block;
    margin-left: 6px;
    padding: 4px 8px;
    border-radius: 10px;
    border: 1px solid rgba(15, 23, 42, 0.10);
    background: rgba(255, 255, 255, 0.70);
  }

  .mapFrame {
    overflow: hidden;
  }

  .map {
    height: calc(100vh - 220px);
    min-height: 620px;
  }

  @media (max-width: 1180px) {
    .kpis {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .mapGrid {
      grid-template-columns: 1fr;
    }
    .sidePanel {
      position: relative;
      top: auto;
    }
    .map {
      height: 70vh;
      min-height: 520px;
    }
  }
</style>
