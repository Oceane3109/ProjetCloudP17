<template>
  <div class="authShell">
    <section class="authHero">
      <div class="authHeroInner">
        <h1 class="authTitle">Créer ton compte</h1>
        <p class="authSubtitle">
          Publie des signalements depuis l’app mobile, puis suis leur traitement dans l’espace manager.
        </p>
        <div class="authKpis">
          <div class="authKpi">Signalements géolocalisés</div>
          <div class="authKpi">Photos (1..N)</div>
          <div class="authKpi">Synchronisation</div>
        </div>
      </div>
    </section>

    <section class="authFormWrap">
      <div class="card authCard">
        <div class="cardHeader">
          <h2 class="authCardTitle">Inscription</h2>
          <p class="muted" style="margin: 0;">Crée un compte en 10 secondes.</p>
        </div>
        <div class="cardBody">
          <p v-if="network.isOffline" class="error" style="margin-top: 0;">
            Hors ligne : l'inscription est indisponible.
          </p>
          <form @submit.prevent="submit" class="form">
            <label>
              Email
              <input v-model="email" type="email" required autocomplete="username" />
            </label>
            <label>
              Mot de passe (min 6)
              <input v-model="password" type="password" required minlength="6" autocomplete="new-password" />
            </label>
            <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
              <button class="btn btnPrimary" type="submit" :disabled="loading || network.isOffline">
                {{ loading ? "..." : "Créer" }}
              </button>
              <RouterLink class="btn btnOutline" to="/login">Retour</RouterLink>
            </div>
            <p v-if="ok" class="ok" style="margin-bottom: 0;">Compte créé. Tu peux te connecter.</p>
            <p v-if="error" class="error" style="margin-bottom: 0;">{{ error }}</p>
          </form>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useAuthStore } from "../stores/auth";
import { useNetworkStore } from "../stores/network";

const auth = useAuthStore();
const network = useNetworkStore();
const email = ref("");
const password = ref("");
const loading = ref(false);
const ok = ref(false);
const error = ref("");

async function submit() {
  if (network.isOffline) return;
  error.value = "";
  ok.value = false;
  loading.value = true;
  try {
    await auth.register(email.value, password.value);
    ok.value = true;
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? "Erreur inscription";
  } finally {
    loading.value = false;
  }
}
</script>
