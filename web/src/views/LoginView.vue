<template>
  <div class="authShell">
    <section class="authHero">
      <div class="authHeroInner">
        <h1 class="authTitle">Gestion de signalements</h1>
        <p class="authSubtitle">
          Une interface claire pour suivre les incidents (carte), les traiter (manager) et synchroniser web/mobile.
        </p>
        <div class="authKpis">
          <div class="authKpi">Carte temps réel</div>
          <div class="authKpi">Sync Firebase ↔ Backend</div>
          <div class="authKpi">Photos & statut</div>
          <div class="authKpi">Mode hors ligne</div>
        </div>
      </div>
    </section>

    <section class="authFormWrap">
      <div class="card authCard">
        <div class="cardHeader">
          <h2 class="authCardTitle">Connexion</h2>
          <p class="muted" style="margin: 0;">Connecte-toi pour accéder à la carte et au manager.</p>
        </div>
        <div class="cardBody">
          <p v-if="network.isOffline" class="error" style="margin-top: 0;">
            Hors ligne : la connexion au serveur est indisponible.
          </p>
          <form @submit.prevent="submit" class="form">
            <label>
              Email
              <input v-model="email" type="email" required autocomplete="username" />
            </label>
            <label>
              Mot de passe
              <input v-model="password" type="password" required autocomplete="current-password" />
            </label>
            <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
              <button class="btn btnPrimary" type="submit" :disabled="loading || network.isOffline">
                {{ loading ? "..." : "Se connecter" }}
              </button>
              <RouterLink class="btn btnOutline" to="/register">Créer un compte</RouterLink>
            </div>
            <p v-if="error" class="error" style="margin-bottom: 0;">{{ error }}</p>
            <div class="authFoot">
              Astuce: compte manager de démo: <b>manager@local</b> / <b>manager</b>
            </div>
          </form>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useNetworkStore } from "../stores/network";

const router = useRouter();
const auth = useAuthStore();
const network = useNetworkStore();
auth.hydrate();

const email = ref("manager@local");
const password = ref("manager");
const loading = ref(false);
const error = ref("");

async function submit() {
  if (network.isOffline) return;
  error.value = "";
  loading.value = true;
  try {
    await auth.login(email.value, password.value);
    await router.push("/");
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? "Erreur de connexion";
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.card {
  max-width: 420px;
  border: 1px solid #e5e7eb;
  padding: 16px;
  border-radius: 8px;
}
.form {
  display: grid;
  gap: 12px;
}
input {
  width: 100%;
  padding: 10px;
  margin-top: 6px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
}
button {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #111827;
  background: #111827;
  color: white;
  cursor: pointer;
}
.muted {
  color: #6b7280;
}
.offlineMsg {
  color: #b91c1c;
  font-size: 14px;
  margin-bottom: 12px;
}
.error {
  color: #b91c1c;
}
</style>

