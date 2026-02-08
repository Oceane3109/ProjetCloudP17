<template>
  <div v-if="network.isOffline" class="offlineBanner">
    Vous êtes hors ligne. Connexion et synchronisation avec le serveur indisponibles.
  </div>
  <div v-if="isAuthRoute" class="container">
    <RouterView />
  </div>
  <div v-else class="appShell">
    <aside class="sidebar">
      <div class="sidebarBrand">
        <div class="logo">IdP</div>
        <div>
          <div class="brandTitle">Cloud S5</div>
          <div class="brandSub">Dashboard</div>
        </div>
      </div>

      <nav class="sidebarNav">
        <div class="navSection">
          <div class="navSectionTitle">Général</div>
          <RouterLink class="sideLink" active-class="active" to="/">
            <span class="sideLinkInner">
              <svg class="sideIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 11l9-8 9 8" />
                <path d="M5 10v10h14V10" />
              </svg>
              Carte
            </span>
          </RouterLink>
          <RouterLink v-if="auth.isAuthed" class="sideLink" active-class="active" to="/mine">
            <span class="sideLinkInner">
              <svg class="sideIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 21s-7-4.4-7-11a7 7 0 0 1 14 0c0 6.6-7 11-7 11z" />
                <circle cx="12" cy="10" r="2" />
              </svg>
              Mes signalements
            </span>
          </RouterLink>
        </div>

        <div v-if="auth.isManager" class="navSection">
          <div class="navSectionTitle">Manager</div>
          <RouterLink class="sideLink" active-class="active" to="/manager/reports">
            <span class="sideLinkInner">
              <svg class="sideIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h16v16H4z" />
                <path d="M8 8h8" />
                <path d="M8 12h8" />
                <path d="M8 16h8" />
              </svg>
              Signalements
            </span>
          </RouterLink>
          <RouterLink class="sideLink" active-class="active" to="/manager/users">
            <span class="sideLinkInner">
              <svg class="sideIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="3" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a3 3 0 0 1 0 5.74" />
              </svg>
              Utilisateurs
            </span>
          </RouterLink>
        </div>

        <div class="navSection">
          <div class="navSectionTitle">Compte</div>
          <RouterLink v-if="!auth.isAuthed" class="sideLink" active-class="active" to="/login">
            <span class="sideLinkInner">
              <svg class="sideIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <path d="M10 17l5-5-5-5" />
                <path d="M15 12H3" />
              </svg>
              Connexion
            </span>
          </RouterLink>
        </div>
      </nav>

      <div class="sidebarFoot">
        <div class="muted small">Mode: {{ network.isOffline ? "Hors ligne" : "En ligne" }}</div>
        <button v-if="auth.isAuthed" class="btn btnOutline" type="button" @click="logout">Logout</button>
      </div>
    </aside>

    <main class="appMain">
      <div class="appMainInner">
        <RouterView />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount } from "vue";
import { useRoute } from "vue-router";
import { computed } from "vue";
import { useAuthStore } from "./stores/auth";
import { useNetworkStore } from "./stores/network";
const auth = useAuthStore();
const network = useNetworkStore();
const route = useRoute();

const isAuthRoute = computed(() => route.path === "/login" || route.path === "/register");

function onOnline() {
  network.setOnline(true);
}
function onOffline() {
  network.setOnline(false);
}
onMounted(() => {
  network.setOnline(navigator.onLine);
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
});
onBeforeUnmount(() => {
  window.removeEventListener("online", onOnline);
  window.removeEventListener("offline", onOffline);
});

async function logout() {
  await auth.logout();
}
</script>

<style scoped>
.offlineBanner {
  background: #b91c1c;
  color: #fff;
  padding: 8px 16px;
  text-align: center;
  font-size: 14px;
}
</style>

