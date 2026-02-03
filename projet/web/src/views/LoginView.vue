<template>
  <div class="card">
    <h2>Connexion</h2>
    <form @submit.prevent="submit" class="form">
      <label>
        Email
        <input v-model="email" type="email" required />
      </label>
      <label>
        Mot de passe
        <input v-model="password" type="password" required />
      </label>
      <button type="submit" :disabled="loading">{{ loading ? "..." : "Se connecter" }}</button>
      <p class="muted">
        Pas de compte ?
        <RouterLink to="/register">Créer un compte</RouterLink>
      </p>
      <p v-if="error" class="error">{{ error }}</p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const router = useRouter();
const auth = useAuthStore();
auth.hydrate();

const email = ref("manager@local");
const password = ref("manager");
const loading = ref(false);
const error = ref("");

async function submit() {
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
.error {
  color: #b91c1c;
}
</style>

