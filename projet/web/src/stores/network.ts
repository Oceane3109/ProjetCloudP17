import { defineStore } from "pinia";

export const useNetworkStore = defineStore("network", {
  state: () => ({ online: typeof navigator !== "undefined" ? navigator.onLine : true }),
  getters: {
    isOffline: (s) => !s.online
  },
  actions: {
    setOnline(value: boolean) {
      this.online = value;
    }
  }
});
