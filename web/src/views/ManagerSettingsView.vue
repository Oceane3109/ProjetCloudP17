<template>
  <div class="managerLayout">
    <div class="managerTopBar">
      <div>
        <h2 class="managerTitle">Manager — Paramètres</h2>
        <p class="muted" style="margin: 0;">Prix forfaitaire et niveaux (1 à 10) utilisés pour calculer le budget.</p>
      </div>
    </div>

    <div class="card">
      <div class="cardHeader">
        <h3 class="h1">Prix par m²</h3>
      </div>
      <div class="cardBody">
        <div class="form">
          <label>
            Prix / m² (MGA)
            <input v-model.number="pricePerM2" type="number" min="0" step="1" />
          </label>
        </div>
        <p class="muted small" style="margin-bottom: 0;">
          Formule: <code>budget = prix_par_m2 × niveau × surface_m2</code>
        </p>
      </div>
    </div>

    <div class="card">
      <div class="cardHeader">
        <h3 class="h1">Niveaux de réparation</h3>
        <p class="muted" style="margin: 0;">Définit la complexité (1 → 10) par type.</p>
      </div>
      <div class="cardBody">
        <div class="levelsGrid">
          <label>
            Trou (POTHOLE)
            <input v-model.number="levels.POTHOLE" type="number" min="1" max="10" step="1" />
          </label>
          <label>
            Travaux (ROADWORK)
            <input v-model.number="levels.ROADWORK" type="number" min="1" max="10" step="1" />
          </label>
          <label>
            Inondation (FLOOD)
            <input v-model.number="levels.FLOOD" type="number" min="1" max="10" step="1" />
          </label>
          <label>
            Éboulement (LANDSLIDE)
            <input v-model.number="levels.LANDSLIDE" type="number" min="1" max="10" step="1" />
          </label>
          <label>
            Autre (OTHER)
            <input v-model.number="levels.OTHER" type="number" min="1" max="10" step="1" />
          </label>
        </div>

        <div class="divider"></div>

        <div style="display:flex; gap:10px; flex-wrap: wrap;">
          <button class="btn btnPrimary" type="button" @click="save">Enregistrer</button>
          <button class="btn btnOutline" type="button" @click="reset">Réinitialiser</button>
        </div>
        <p v-if="ok" class="ok" style="margin-bottom: 0;">Enregistré</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { useManagerSettingsStore } from "../stores/managerSettings";

const settings = useManagerSettingsStore();

const ok = ref(false);
const pricePerM2 = ref<number>(settings.pricePerM2);
const levels = reactive({ ...settings.levelsByType });

onMounted(() => {
  settings.hydrate();
  pricePerM2.value = settings.pricePerM2;
  Object.assign(levels, settings.levelsByType);
});

function save() {
  ok.value = false;
  settings.setPricePerM2(pricePerM2.value);
  settings.setLevel("POTHOLE", levels.POTHOLE);
  settings.setLevel("ROADWORK", levels.ROADWORK);
  settings.setLevel("FLOOD", levels.FLOOD);
  settings.setLevel("LANDSLIDE", levels.LANDSLIDE);
  settings.setLevel("OTHER", levels.OTHER);
  ok.value = true;
}

function reset() {
  ok.value = false;
  localStorage.removeItem("managerSettings");
  settings.hydrate();
  pricePerM2.value = settings.pricePerM2;
  Object.assign(levels, settings.levelsByType);
}
</script>

<style scoped>
.levelsGrid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.divider {
  height: 1px;
  background: rgba(15, 23, 42, 0.10);
  margin: 12px 0;
}

@media (max-width: 980px) {
  .levelsGrid {
    grid-template-columns: 1fr;
  }
}
</style>
