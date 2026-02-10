<template>
  <div class="mineDash">
    <div class="mineTop">
      <div>
        <h2 class="mineTitle">Mes signalements</h2>
        <p class="muted" style="margin: 0;">Création côté backend (Postgres). Pour afficher sur mobile: fais un <b>push</b> depuis Manager.</p>
      </div>
      <div class="mineActions">
        <button class="btn btnOutline" @click="refresh" :disabled="loading">Rafraîchir</button>
      </div>
    </div>

    <div class="mineGrid">
      <div class="card">
        <div class="cardHeader">
          <h3 class="h1">Créer</h3>
        </div>
        <div class="cardBody">
          <form class="form" @submit.prevent="create">
            <label>
              Type
              <select v-model="type">
                <option value="POTHOLE">Trou / nid de poule</option>
                <option value="ROADWORK">Travaux</option>
                <option value="FLOOD">Inondation</option>
                <option value="LANDSLIDE">Éboulement / glissement</option>
                <option value="OTHER">Autre</option>
              </select>
            </label>
            <label>
              Titre
              <input v-model="title" required maxlength="200" />
            </label>
            <label>
              Description
              <textarea v-model="description" maxlength="5000" rows="3"></textarea>
            </label>
            <div class="grid2cols">
              <label>
                Latitude
                <input v-model.number="latitude" type="number" step="0.000001" required />
              </label>
              <label>
                Longitude
                <input v-model.number="longitude" type="number" step="0.000001" required />
              </label>
            </div>
            <div>
              <div class="muted" style="margin-bottom: 6px;">
                Choisis l’emplacement en cliquant sur la carte (ça remplit automatiquement les coordonnées).
              </div>
              <div ref="mapEl" class="pickMap"></div>
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <button class="btn btnOutline" type="button" @click="useMyLocation" :disabled="loading">Utiliser ma position</button>
              <button class="btn btnPrimary" type="submit" :disabled="loading">{{ loading ? "..." : "Créer" }}</button>
            </div>
          </form>
          <p v-if="error" class="error" style="margin-bottom: 0;">{{ error }}</p>
          <p v-if="ok" class="ok" style="margin-bottom: 0;">Créé</p>
        </div>
      </div>

      <div class="card">
        <div class="cardHeader">
          <h3 class="h1">Liste</h3>
          <p class="muted" style="margin: 0;">Total: <b>{{ items.length }}</b></p>
        </div>
        <div class="cardBody">
          <div class="tableScroll" v-if="items.length">
            <table class="table">
              <thead>
                <tr>
                  <th>Titre</th>
                  <th>Status</th>
                  <th>Lat</th>
                  <th>Lng</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in items" :key="r.id">
                  <td>{{ r.title }}</td>
                  <td>
                    <span class="statusTag" :class="{ new: r.status === 'NEW', progress: r.status === 'IN_PROGRESS', done: r.status === 'DONE' }">
                      {{ r.status }}
                    </span>
                  </td>
                  <td>{{ r.latitude.toFixed(5) }}</td>
                  <td>{{ r.longitude.toFixed(5) }}</td>
                  <td>
                    <button class="btn btnDanger" @click="remove(r.id)" :disabled="loading">Supprimer</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="muted" v-else>Aucun signalement.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import L from "leaflet";
import { api } from "../api";

type Report = {
  id: string;
  title: string;
  description: string | null;
  latitude: number;
  longitude: number;
  status: string;
};

const items = ref<Report[]>([]);
const type = ref("POTHOLE");
const title = ref("Trou sur la route");
const description = ref("");
const latitude = ref(-18.8792);
const longitude = ref(47.5079);
const loading = ref(false);
const error = ref("");
const ok = ref(false);

const mapEl = ref<HTMLDivElement | null>(null);
const tileUrl =
  (import.meta.env.VITE_OSM_TILE_URL as string | undefined) ??
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

let map: L.Map | null = null;
let marker: L.Marker | null = null;

function useMyLocation() {
  error.value = "";
  if (!navigator.geolocation) {
    error.value = "Géolocalisation non supportée";
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      latitude.value = pos.coords.latitude;
      longitude.value = pos.coords.longitude;
      map?.setView([latitude.value, longitude.value], Math.max(map.getZoom(), 16));
    },
    () => {
      error.value = "Impossible d'obtenir la position";
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

async function refresh() {
  const { data } = await api.get<Report[]>("/api/reports/mine");
  items.value = data;
}

async function create() {
  ok.value = false;
  error.value = "";
  loading.value = true;
  try {
    await api.post("/api/reports", {
      type: type.value,
      title: title.value,
      description: description.value,
      latitude: latitude.value,
      longitude: longitude.value
    });
    ok.value = true;
    await refresh();
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? "Erreur création";
  } finally {
    loading.value = false;
  }
}

async function remove(id: string) {
  ok.value = false;
  error.value = "";
  loading.value = true;
  try {
    await api.delete(`/api/reports/${id}`);
    await refresh();
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? "Erreur suppression";
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  try {
    await refresh();
  } catch {
    // ignore
  }

  if (!mapEl.value) return;
  map = L.map(mapEl.value, {
    zoomControl: true,
    attributionControl: true
  }).setView([latitude.value, longitude.value], 13);

  L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(map);

  marker = L.marker([latitude.value, longitude.value]).addTo(map);
  marker.bindTooltip("Position du signalement", { direction: "top" });

  map.on("click", (e: L.LeafletMouseEvent) => {
    latitude.value = Number(e.latlng.lat.toFixed(6));
    longitude.value = Number(e.latlng.lng.toFixed(6));
    ok.value = false;
    map?.panTo(e.latlng, { animate: false });
  });
});

watch([latitude, longitude], ([lat, lng]) => {
  if (!marker) return;
  marker.setLatLng([lat, lng]);
});

onBeforeUnmount(() => {
  map?.remove();
  map = null;
  marker = null;
});
</script>

<style scoped>
.form {
  display: grid;
  gap: 10px;
}

.grid2cols {
  display: grid;
  gap: 10px;
  grid-template-columns: 1fr 1fr;
}

.pickMap {
  height: 260px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.mineDash {
  display: grid;
  gap: 14px;
}

.mineTop {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.mineTitle {
  margin: 0 0 6px 0;
  font-size: 22px;
  font-weight: 900;
  letter-spacing: -0.3px;
}

.mineActions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.mineGrid {
  display: grid;
  gap: 14px;
  grid-template-columns: 420px 1fr;
  align-items: start;
}

.tableScroll {
  overflow: auto;
}

.statusTag {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.10);
  background: rgba(15, 23, 42, 0.04);
  font-weight: 900;
  font-size: 12px;
}

.statusTag.new {
  border-color: rgba(225, 29, 72, 0.18);
  background: rgba(225, 29, 72, 0.06);
}

.statusTag.progress {
  border-color: rgba(245, 158, 11, 0.22);
  background: rgba(245, 158, 11, 0.08);
}

.statusTag.done {
  border-color: rgba(22, 163, 74, 0.18);
  background: rgba(22, 163, 74, 0.06);
}

@media (max-width: 1180px) {
  .mineGrid {
    grid-template-columns: 1fr;
  }
}
</style>

