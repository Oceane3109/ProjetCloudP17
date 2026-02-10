import { defineStore } from "pinia";

export type RepairType = "POTHOLE" | "ROADWORK" | "FLOOD" | "LANDSLIDE" | "OTHER";

export type ManagerSettingsState = {
  pricePerM2: number;
  levelsByType: Record<RepairType, number>;
};

const STORAGE_KEY = "managerSettings";

function clampLevel(n: any): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return 1;
  return Math.min(10, Math.max(1, Math.round(v)));
}

export const useManagerSettingsStore = defineStore("managerSettings", {
  state: (): ManagerSettingsState => ({
    pricePerM2: 1000,
    levelsByType: {
      POTHOLE: 3,
      ROADWORK: 5,
      FLOOD: 6,
      LANDSLIDE: 7,
      OTHER: 4
    }
  }),
  actions: {
    hydrate() {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        const next: ManagerSettingsState = {
          pricePerM2: Number(parsed.pricePerM2) || 0,
          levelsByType: {
            POTHOLE: clampLevel(parsed.levelsByType?.POTHOLE),
            ROADWORK: clampLevel(parsed.levelsByType?.ROADWORK),
            FLOOD: clampLevel(parsed.levelsByType?.FLOOD),
            LANDSLIDE: clampLevel(parsed.levelsByType?.LANDSLIDE),
            OTHER: clampLevel(parsed.levelsByType?.OTHER)
          }
        };
        this.pricePerM2 = Number.isFinite(next.pricePerM2) ? next.pricePerM2 : this.pricePerM2;
        this.levelsByType = next.levelsByType;
      } catch {
        // ignore
      }
    },
    persist() {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          pricePerM2: this.pricePerM2,
          levelsByType: this.levelsByType
        })
      );
    },
    setPricePerM2(v: any) {
      const n = Number(v);
      this.pricePerM2 = Number.isFinite(n) && n >= 0 ? n : 0;
      this.persist();
    },
    setLevel(type: RepairType, level: any) {
      this.levelsByType[type] = clampLevel(level);
      this.persist();
    }
  }
});
