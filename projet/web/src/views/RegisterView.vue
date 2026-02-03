<template>
  <div class="card">
    <h2>Créer un compte</h2>
    <form @submit.prevent="submit" class="form">
      <label>
        Email
        <input v-model="email" type="email" required />
      </label>
      <label>
        Mot de passe (min 6)
        <input v-model="password" type="password" required minlength="6" />
      </label>
      <button type="submit" :disabled="loading">{{ loading ? "..." : "Créer" }}</button>
      <p class="muted">
        Déjà un compte ?
        <RouterLink to="/login">Se connecter</RouterLink>
      </p>
      <p v-if="ok" class="ok">Compte créé. Tu peux te connecter.</p>
      <p v-if="error" class="error">{{ error }}</p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();
const email = ref("");
const password = ref("");
const loading = ref(false);
const ok = ref(false);
const error = ref("");

async function submit() {
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
.ok {
  color: #047857;
}
.error {
  color: #b91c1c;
}
</style>

