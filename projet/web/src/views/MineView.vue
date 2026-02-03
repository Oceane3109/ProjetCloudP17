<template>
  <div class="grid2">
    <div class="card">
      <div class="cardHeader">
        <h2 class="h1">Mes signalements</h2>
        <p class="muted">Création côté backend (Postgres). Pour afficher sur mobile: fais un <b>push</b> depuis Manager.</p>
      </div>
      <div class="cardBody">
      <form class="form" @submit.prevent="create">
        <label>
          Titre
          <input v-model="title" required maxlength="200" />
        </label>
        <label>
          Description
          <textarea v-model="description" maxlength="5000" rows="3"></textarea>
        </label>
        <label>
          Latitude
          <input v-model.number="latitude" type="number" step="0.000001" required />
        </label>
        <label>
          Longitude
          <input v-model.number="longitude" type="number" step="0.000001" required />
        </label>
        <button class="ghost" type="button" @click="useMyLocation" :disabled="loading">
          Utiliser ma position
        </button>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button class="btn btnOutline" type="button" @click="useMyLocation" :disabled="loading">Utiliser ma position</button>
          <button class="btn btnPrimary" type="submit" :disabled="loading">{{ loading ? "..." : "Créer" }}</button>
        </div>
      </form>
      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="ok" class="ok">Créé</p>
      </div>
    </div>

    <div class="card">
      <div class="cardHeader">
        <h3 class="h1">Liste</h3>
      </div>
      <div class="cardBody">
      <button class="btn btnOutline" @click="refresh" :disabled="loading">Rafraîchir</button>
      <table class="table" v-if="items.length">
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
            <td>{{ r.status }}</td>
            <td>{{ r.latitude.toFixed(5) }}</td>
            <td>{{ r.longitude.toFixed(5) }}</td>
            <td>
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
  description: string | null;
  latitude: number;
  longitude: number;
  status: string;
};

const items = ref<Report[]>([]);
const title = ref("Trou sur la route");
const description = ref("");
const latitude = ref(-18.8792);
const longitude = ref(47.5079);
const loading = ref(false);
const error = ref("");
const ok = ref(false);

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
});
</script>

<style scoped>
.form {
  display: grid;
  gap: 10px;
}
</style>

