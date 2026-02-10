import { createRouter, createWebHistory } from "vue-router";
import MapView from "./views/MapView.vue";
import LoginView from "./views/LoginView.vue";
import RegisterView from "./views/RegisterView.vue";
import MineView from "./views/MineView.vue";
import ManagerView from "./views/ManagerView.vue";
import ManagerReportsView from "./views/ManagerReportsView.vue";
import ManagerUsersView from "./views/ManagerUsersView.vue";
import { useAuthStore } from "./stores/auth";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: MapView },
    { path: "/login", component: LoginView },
    { path: "/register", component: RegisterView },
    { path: "/mine", component: MineView, meta: { auth: true } },
    { path: "/manager", redirect: "/manager/reports", meta: { auth: true, manager: true } },
    { path: "/manager/reports", component: ManagerReportsView, meta: { auth: true, manager: true } },
    { path: "/manager/users", component: ManagerUsersView, meta: { auth: true, manager: true } },
    { path: "/manager/legacy", component: ManagerView, meta: { auth: true, manager: true } }
  ]
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  auth.hydrate();
  if (to.meta.auth && !auth.isAuthed) return "/login";
  if (to.meta.manager && !auth.isManager) return "/";
});

export default router;

