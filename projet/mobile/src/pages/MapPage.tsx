import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  IonButton,
  IonButtons,
  IonContent,
  IonIcon,
  IonHeader,
  IonPage,
  IonText,
  IonToast,
  IonTitle,
  IonToolbar,
  useIonViewDidEnter
} from "@ionic/react";
import L from "leaflet";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { firestore } from "../firebase";
import type { Report } from "../types";
import { useAuth } from "../auth";
import { logOutOutline } from "ionicons/icons";

const TILE_URL =
  ((import.meta as any).env?.VITE_OSM_TILE_URL as string | undefined) ??
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const MY_REPORT_IDS_KEY = "my_report_ids";
const MY_REPORT_STATUS_KEY = "my_report_status";

function loadMyReportStatus(): Map<string, string> {
  try {
    const raw = localStorage.getItem(MY_REPORT_STATUS_KEY);
    if (!raw) return new Map();
    const parsed = JSON.parse(raw) as Record<string, string>;
    const m = new Map<string, string>();
    for (const [k, v] of Object.entries(parsed ?? {})) {
      if (typeof k === "string" && typeof v === "string") m.set(k, v);
    }
    return m;
  } catch {
    return new Map();
  }
}

function saveMyReportStatus(m: Map<string, string>) {
  try {
    const obj: Record<string, string> = {};
    for (const [k, v] of m.entries()) obj[k] = v;
    localStorage.setItem(MY_REPORT_STATUS_KEY, JSON.stringify(obj));
  } catch {
    // ignore
  }
}

function iconForReport(r: { status: string; type?: string; title?: string }) {
  const s = (r.status || "").toUpperCase();
  const statusColor = s === "DONE" ? "#22c55e" : s === "IN_PROGRESS" ? "#f59e0b" : "#ef4444";
  const t = ((r.type || "") + " " + (r.title || "")).toUpperCase();
  const type =
    t.includes("FLOOD") || t.includes("INOND") ? "FLOOD" :
    t.includes("LANDSLIDE") || t.includes("EBOUL") || t.includes("ECROUL") || t.includes("GLISS") ? "LANDSLIDE" :
    t.includes("ROADWORK") || t.includes("TRAVAUX") || t.includes("CHANTIER") ? "ROADWORK" :
    t.includes("POTHOLE") || t.includes("TROU") || t.includes("NID") ? "POTHOLE" :
    "OTHER";

  const color =
    type === "POTHOLE" ? "#ef4444" :
    type === "ROADWORK" ? "#f59e0b" :
    type === "FLOOD" ? "#3b82f6" :
    type === "LANDSLIDE" ? "#a855f7" :
    "#64748b";

  const glyph =
    type === "POTHOLE"
      ? `<circle cx="19" cy="18" r="4.6" fill="#0f172a"/><path d="M15.5 18.5 L22.5 17" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round"/>`
      : type === "ROADWORK"
      ? `<path d="M14 23 h10 a2 2 0 0 0 2-2 v-6 a2 2 0 0 0-2-2 h-10 a2 2 0 0 0-2 2 v6 a2 2 0 0 0 2 2z" fill="#0f172a"/><path d="M13.5 16.5 L24.5 21.5" stroke="#ffffff" stroke-width="1.4"/><path d="M13.5 19.5 L21.5 23" stroke="#ffffff" stroke-width="1.4"/>`
      : type === "FLOOD"
      ? `<path d="M13 20 c2 2 4 2 6 0 s4-2 6 0" fill="none" stroke="#0f172a" stroke-width="1.6" stroke-linecap="round"/><path d="M13 16 c2 2 4 2 6 0 s4-2 6 0" fill="none" stroke="#0f172a" stroke-width="1.6" stroke-linecap="round"/>`
      : type === "LANDSLIDE"
      ? `<path d="M13 23 L18.5 13 L25 23 Z" fill="#0f172a"/><circle cx="14.5" cy="15.5" r="1.2" fill="#0f172a"/><circle cx="12.8" cy="18" r="1.1" fill="#0f172a"/><circle cx="11.8" cy="20.5" r="1.0" fill="#0f172a"/>`
      : `<path d="M19 13 a5 5 0 1 0 0.001 0z" fill="#0f172a"/><path d="M19 16 v4" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round"/><circle cx="19" cy="22" r="1.1" fill="#ffffff"/>`;

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="34" height="46" viewBox="0 0 34 46">
    <path d="M17 45C17 45 2 28.5 2 18C2 8.6 9.6 1 19 1C28.4 1 32 8.6 32 18C32 28.5 17 45 17 45Z"
          fill="${color}" stroke="rgba(15,23,42,0.35)" stroke-width="1.5"/>
    <circle cx="19" cy="18" r="6" fill="white" fill-opacity="0.95"/>
    <circle cx="28" cy="10" r="4" fill="${statusColor}" stroke="white" stroke-width="1.5"/>
    ${glyph}
  </svg>
  `.trim();
  const url = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  return L.icon({
    iconUrl: url,
    iconSize: [34, 46],
    iconAnchor: [19, 45],
    popupAnchor: [0, -40],
    tooltipAnchor: [10, -28]
  });
}

export default function MapPage() {
  const { logout, user } = useAuth();
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const didAutoFitRef = useRef(false);
  const didInitNotifRef = useRef(false);
  const prevStatusRef = useRef<Map<string, string>>(new Map());
  const persistedStatusRef = useRef<Map<string, string>>(loadMyReportStatus());
  const myIdsRef = useRef<Set<string>>(loadMyReportIds());
  const [reports, setReports] = useState<Report[]>([]);
  const [mineOnly, setMineOnly] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const filtered = useMemo(() => {
    if (!mineOnly) return reports;
    const uid = user?.uid ?? "";
    if (!uid) return reports;
    const myIds = myIdsRef.current;
    return reports.filter((r) => (r as any).userId === uid || myIds.has(String((r as any).id ?? r.id)));
  }, [reports, mineOnly, user?.uid]);

  const stats = useMemo(() => {
    const points = filtered.length;
    const surface = filtered.reduce((sum, r) => sum + (Number(r.surfaceM2 ?? 0) || 0), 0);
    const budget = filtered.reduce((sum, r) => sum + (Number(r.budgetAmount ?? 0) || 0), 0);
    const progressVals = filtered.map((r) => r.progressPercent).filter((v): v is number => v != null);
    const avgProgress = progressVals.length
      ? Math.round(progressVals.reduce((a, b) => a + b, 0) / progressVals.length)
      : 0;

    const byStatus = filtered.reduce(
      (acc, r) => {
        const s = String((r as any).status ?? "").toUpperCase();
        if (s === "IN_PROGRESS") acc.inProgress += 1;
        else if (s === "DONE") acc.done += 1;
        else acc.new += 1;
        return acc;
      },
      { new: 0, inProgress: 0, done: 0 }
    );

    return { points, surface, budget, avgProgress, byStatus };
  }, [filtered]);

  useEffect(() => {
    // Permission pour notifications (best effort)
    try {
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {
          // ignore
        });
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const q = query(collection(firestore, "reports"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const next: Report[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setReports(next);

      const uid = user?.uid ?? "";
      if (!uid) return;

      // Notifier seulement après le premier chargement, sinon spam
      if (!didInitNotifRef.current) {
        didInitNotifRef.current = true;
        // Au démarrage, comparer au dernier état persisté (localStorage) pour
        // notifier les changements survenus pendant que l'app était fermée.
        const persistedPrev = loadMyReportStatus();
        myIdsRef.current = loadMyReportIds();
        const myIds = myIdsRef.current;

        let notified = 0;
        for (const r of next) {
          const isMine = (r as any).userId === uid || myIds.has(String((r as any).id ?? r.id));
          if (!isMine) continue;

          const id = r.id;
          const currentStatus = String((r as any).status ?? "");
          const old = persistedPrev.get(id);
          if (old != null && old !== currentStatus) {
            const title = String((r as any).title ?? "Signalement");
            const msg = `${title}: ${old} → ${currentStatus}`;
            setToastMsg(msg);
            setToastOpen(true);
            notifyStatusChange(title, old, currentStatus);
            notified += 1;
            // Eviter de spammer si beaucoup de statuts ont changé.
            if (notified >= 3) break;
          }
        }

        const m = new Map<string, string>();
        for (const r of next) {
          // on mémorise tous les statuts pour pouvoir détecter les changements ensuite,
          // même si un report devient "à moi" après un push backend
          m.set(r.id, String((r as any).status ?? ""));
        }
        prevStatusRef.current = m;
        persistedStatusRef.current = m;
        saveMyReportStatus(m);
        return;
      }

      const prev = prevStatusRef.current;
      const persistedPrev = persistedStatusRef.current;
      const fresh = new Map<string, string>();
      myIdsRef.current = loadMyReportIds();
      const myIds = myIdsRef.current;
      for (const r of next) {
        const isMine = (r as any).userId === uid || myIds.has(String((r as any).id ?? r.id));
        const id = r.id;
        const currentStatus = String((r as any).status ?? "");
        const old = persistedPrev.get(id) ?? prev.get(id);
        if (isMine && old != null && old !== currentStatus) {
          const title = String((r as any).title ?? "Signalement");
          const msg = `${title}: ${old} → ${currentStatus}`;
          setToastMsg(msg);
          setToastOpen(true);
          notifyStatusChange(title, old, currentStatus);
        }
        fresh.set(id, currentStatus);
      }

      // Nettoyer les reports supprimés pour éviter que le localStorage grossisse.
      // Comme fresh est reconstruit depuis la liste actuelle, il ne contient déjà plus les IDs supprimés.
      prevStatusRef.current = fresh;
      persistedStatusRef.current = fresh;
      saveMyReportStatus(fresh);
    });
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    if (!mapEl.current) return;
    const map = L.map(mapEl.current).setView([-18.8792, 47.5079], 13);
    L.tileLayer(TILE_URL, { maxZoom: 19 }).addTo(map);
    const layer = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerRef.current = layer;

    // Important dans Ionic: laisser le layout se stabiliser puis recalculer la taille
    // Utilise whenReady pour s'assurer que tous les panes existent avant invalidateSize
    map.whenReady(() =>
      setTimeout(() => {
        try {
          // guard against early/internal leaflet state where panes are not yet defined
          const anyMap = map as any;
          const mapPane = anyMap?._panes?.mapPane;
          const hasPos = !!mapPane && !!(mapPane as any)._leaflet_pos;
          if (!hasPos) return;
          map.invalidateSize();
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn("Error while invalidating Leaflet map size", e);
        }
      }, 200)
    );

    return () => {
      layer.clearLayers();
      map.remove();
      layerRef.current = null;
      mapRef.current = null;
    };
  }, []);

  // Quand on revient sur l'onglet, Leaflet doit recalculer sa taille
  useIonViewDidEnter(() => {
    const map = mapRef.current;
    if (!map) return;
    map.whenReady(() =>
      setTimeout(() => {
        try {
          const anyMap = map as any;
          const mapPane = anyMap?._panes?.mapPane;
          const hasPos = !!mapPane && !!(mapPane as any)._leaflet_pos;
          if (!hasPos) return;
          map.invalidateSize();
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn("Error while invalidating Leaflet map size on view enter", e);
        }
      }, 200)
    );
  });

  useEffect(() => {
    const layer = layerRef.current;
    const map = mapRef.current;
    if (!layer) return;

    layer.clearLayers();

    // Evite les superpositions: si plusieurs points ont exactement les mêmes coords,
    // on les décale légèrement pour que l'utilisateur voie bien tous les marqueurs.
    const seen = new Map<string, number>();

    const bounds = L.latLngBounds([]);

    for (const r of filtered) {
      const lat = Number((r as any).latitude);
      const lng = Number((r as any).longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
      const idx = seen.get(key) ?? 0;
      seen.set(key, idx + 1);

      const jitter = idx === 0 ? 0 : idx * 0.00015; // ~15m par incrément (approx)
      const p = L.latLng(lat + jitter, lng + jitter);
      bounds.extend(p);

      const m = L.marker([p.lat, p.lng], { icon: iconForReport(r as any) });
      const surface = displayValue((r as any).surfaceM2);
      const budget = displayValue((r as any).budgetAmount);
      const progress = displayValue((r as any).progressPercent);
      const company = displayValue((r as any).companyName);
      const dNew = formatFsDate((r as any).statusNewAt);
      const dProg = formatFsDate((r as any).statusInProgressAt);
      const dDone = formatFsDate((r as any).statusDoneAt);
      m.bindTooltip(
        `<b>${escapeHtml(r.title)}</b><br/>Status: ${escapeHtml(r.status)}<br/>Entreprise: ${company}<br/>Surface: ${surface} m²<br/>Budget: ${budget}<br/>Avancement: ${progress}%<br/>NEW: ${dNew}<br/>IN_PROGRESS: ${dProg}<br/>DONE: ${dDone}`,
        { direction: "top", sticky: true, opacity: 0.95 }
      );
      m.addTo(layer);
    }

    // Auto-cadrage une seule fois (sinon ça "saute" si l'utilisateur zoome/manipule)
    if (map && !didAutoFitRef.current && bounds.isValid()) {
      didAutoFitRef.current = true;
      setTimeout(() => {
        try {
          map.fitBounds(bounds, { padding: [20, 20], maxZoom: 16 });
        } catch {
          // ignore
        }
      }, 50);
    }
  }, [filtered]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Carte</IonTitle>
          <IonButtons slot="end">
            <IonButton fill="clear" onClick={() => logout()}>
              <IonIcon slot="icon-only" icon={logOutOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonToast
          isOpen={toastOpen}
          message={toastMsg}
          duration={3500}
          color="dark"
          position="middle"
          cssClass="big-center-toast"
          onDidDismiss={() => setToastOpen(false)}
        />
        <div style={{ height: "100%", position: "relative" }}>
          <div ref={mapEl} style={{ position: "absolute", inset: 0 }} />

          <div
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              right: 10,
              zIndex: 500,
              pointerEvents: "none"
            }}
          >
            <div
              style={{
                pointerEvents: "auto",
                borderRadius: 18,
                border: "1px solid rgba(15,23,42,0.12)",
                background: "rgba(255,255,255,0.92)",
                backdropFilter: "blur(10px)",
                padding: 12,
                boxShadow: "0 14px 40px rgba(15, 23, 42, 0.12)"
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <IonText color="dark">
                    <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.2 }}>Tableau de bord</div>
                  </IonText>
                  <IonText color="medium">
                    <div style={{ fontSize: 12, marginTop: 3 }}>
                      Points {stats.points} · NEW {stats.byStatus.new} · IN_PROGRESS {stats.byStatus.inProgress} · DONE {stats.byStatus.done}
                    </div>
                  </IonText>
                </div>
                <IonButton
                  size="small"
                  fill={mineOnly ? "solid" : "outline"}
                  onClick={() => setMineOnly((v) => !v)}
                >
                  {mineOnly ? "Mes" : "Tous"}
                </IonButton>
              </div>

              <div
                style={{
                  marginTop: 10,
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 10
                }}
              >
                <div
                  style={{
                    borderRadius: 14,
                    border: "1px solid rgba(15,23,42,0.10)",
                    background: "rgba(15,23,42,0.03)",
                    padding: 10
                  }}
                >
                  <div style={{ fontSize: 11, color: "rgba(15,23,42,0.65)", fontWeight: 700, letterSpacing: 0.2 }}>
                    Surface totale
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, marginTop: 3 }}>{formatNumber(stats.surface)} m²</div>
                </div>
                <div
                  style={{
                    borderRadius: 14,
                    border: "1px solid rgba(15,23,42,0.10)",
                    background: "rgba(15,23,42,0.03)",
                    padding: 10
                  }}
                >
                  <div style={{ fontSize: 11, color: "rgba(15,23,42,0.65)", fontWeight: 700, letterSpacing: 0.2 }}>
                    Budget total
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, marginTop: 3 }}>{formatMoney(stats.budget)} MGA</div>
                </div>
                <div
                  style={{
                    gridColumn: "1 / -1",
                    borderRadius: 14,
                    border: "1px solid rgba(15,23,42,0.10)",
                    background: "rgba(15,23,42,0.03)",
                    padding: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10
                  }}
                >
                  <div style={{ fontSize: 11, color: "rgba(15,23,42,0.65)", fontWeight: 700, letterSpacing: 0.2 }}>
                    Avancement moyen
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 900 }}>{stats.avgProgress}%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}

function escapeHtml(s: string) {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function formatNumber(n: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n);
}

function formatMoney(n: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);
}

function displayValue(v: any): string {
  if (v === null || v === undefined) return "-";
  const s = String(v);
  if (s.trim() === "") return "-";
  return s;
}

function formatFsDate(v: any): string {
  if (v === null || v === undefined) return "-";
  try {
    // Firestore Timestamp (web SDK) has .toDate()
    if (typeof v?.toDate === "function") {
      const d: Date = v.toDate();
      return d.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
    }
    // Sometimes it can already be a Date
    if (v instanceof Date) {
      return v.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
    }
    // Or an ISO string
    const d = new Date(String(v));
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
    }
    return "-";
  } catch {
    return "-";
  }
}

function notifyStatusChange(title: string, from: string, to: string) {
  try {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    new Notification("Changement de statut", {
      body: `${title}: ${from} → ${to}`
    });
  } catch {
    // ignore
  }
}

function loadMyReportIds(): Set<string> {
  try {
    const raw = localStorage.getItem(MY_REPORT_IDS_KEY);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    const ids = Array.isArray(arr) ? arr : [];
    return new Set(ids.map((x) => String(x)));
  } catch {
    return new Set();
  }
}

