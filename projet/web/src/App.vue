<template>
  <header class="topbar">
    <div class="topbarInner">
      <div class="brand">
        <span class="pill" style="border-color: rgba(110,231,255,0.45)">IdP</span>
        Cloud S5
      </div>
      <nav class="nav">
        <RouterLink class="pill" active-class="active" to="/">Carte</RouterLink>
        <RouterLink v-if="auth.isAuthed" class="pill" active-class="active" to="/mine">Mes signalements</RouterLink>
        <RouterLink v-if="auth.isManager" class="pill" active-class="active" to="/manager">Manager</RouterLink>
        <RouterLink v-if="!auth.isAuthed" class="pill" active-class="active" to="/login">Login</RouterLink>
        <button v-else class="pill" type="button" @click="logout">Logout</button>
      </nav>
    </div>
  </header>
  <main class="container">
    <RouterView />
  </main>
</template>

<script setup lang="ts">
import { useAuthStore } from "./stores/auth";
const auth = useAuthStore();

async function logout() {
  await auth.logout();
}
</script>

