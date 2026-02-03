import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  IonButton,
  IonButtons,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
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

const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

export default function MapPage() {
  const { logout } = useAuth();
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const didAutoFitRef = useRef(false);
  const [reports, setReports] = useState<Report[]>([]);

  const stats = useMemo(() => {
    const points = reports.length;
    const surface = reports.reduce((sum, r) => sum + (Number(r.surfaceM2 ?? 0) || 0), 0);
    const budget = reports.reduce((sum, r) => sum + (Number(r.budgetAmount ?? 0) || 0), 0);
    const progressVals = reports.map((r) => r.progressPercent).filter((v): v is number => v != null);
    const avgProgress = progressVals.length
      ? Math.round(progressVals.reduce((a, b) => a + b, 0) / progressVals.length)
      : 0;
    return { points, surface, budget, avgProgress };
  }, [reports]);

  useEffect(() => {
    const q = query(collection(firestore, "reports"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const next: Report[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setReports(next);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!mapEl.current) return;
    const map = L.map(mapEl.current).setView([-18.8792, 47.5079], 13);
    L.tileLayer(TILE_URL, { maxZoom: 19 }).addTo(map);
    const layer = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerRef.current = layer;

    // Important dans Ionic: laisser le layout se stabiliser puis recalculer la taille
    setTimeout(() => map.invalidateSize(), 50);

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
    setTimeout(() => map.invalidateSize(), 50);
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

    for (const r of reports) {
      const lat = Number((r as any).latitude);
      const lng = Number((r as any).longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
      const idx = seen.get(key) ?? 0;
      seen.set(key, idx + 1);

      const jitter = idx === 0 ? 0 : idx * 0.00015; // ~15m par incrément (approx)
      const p = L.latLng(lat + jitter, lng + jitter);
      bounds.extend(p);

      const m = L.marker([p.lat, p.lng]);
      m.bindTooltip(
        `<b>${escapeHtml(r.title)}</b><br/>Status: ${escapeHtml(r.status)}<br/>Surface: ${
          r.surfaceM2 ?? "-"
        } m²<br/>Budget: ${r.budgetAmount ?? "-"}<br/>Avancement: ${r.progressPercent ?? "-"}%`,
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
  }, [reports]);

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
        <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <IonChip color="primary">Points: {stats.points}</IonChip>
            <IonChip color="secondary">Surface: {formatNumber(stats.surface)} m²</IonChip>
            <IonChip color="secondary">Budget: {formatMoney(stats.budget)} MGA</IonChip>
            <IonChip color="primary">Avancement: {stats.avgProgress}%</IonChip>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <div ref={mapEl} style={{ height: "100%", width: "100%" }} />
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

