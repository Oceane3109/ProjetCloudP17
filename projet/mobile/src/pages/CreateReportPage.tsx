import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonText,
  IonTextarea,
  IonTitle,
  IonToolbar,
  useIonViewDidEnter
} from "@ionic/react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { firestore } from "../firebase";
import { useAuth } from "../auth";
import type { ReportType } from "../types";
import L from "leaflet";

const API_BASE = (import.meta.env.VITE_API_URL as string) || "http://localhost:8084";
const TILE_URL =
  ((import.meta as any).env?.VITE_OSM_TILE_URL as string | undefined) ??
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const MY_REPORT_IDS_KEY = "my_report_ids";

export default function CreateReportPage() {
  const { user } = useAuth();
  const [title, setTitle] = useState("Trou sur la route");
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState(-18.8792);
  const [longitude, setLongitude] = useState(47.5079);
  const [type, setType] = useState<ReportType>("POTHOLE");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const [filePreviewUrls, setFilePreviewUrls] = useState<string[]>([]);

  const canSubmit = useMemo(() => !!user && title.trim().length > 0 && !loading, [user, title, loading]);

  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapEl.current) return;
    if (mapRef.current) return;

    const map = L.map(mapEl.current).setView([latitude, longitude], 13);
    L.tileLayer(TILE_URL, { maxZoom: 19 }).addTo(map);
    const marker = L.marker([latitude, longitude]).addTo(map);
    marker.bindTooltip("Clique pour choisir l'emplacement", { direction: "top" });

    map.on("click", (e: L.LeafletMouseEvent) => {
      const lat = Number(e.latlng.lat.toFixed(6));
      const lng = Number(e.latlng.lng.toFixed(6));
      setLatitude(lat);
      setLongitude(lng);
    });

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      map.off();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useIonViewDidEnter(() => {
    const map = mapRef.current;
    if (!map) return;

    map.whenReady(() =>
      setTimeout(() => {
        try {
          const anyMap = map as any;
          if (anyMap && anyMap._panes && anyMap._panes.mapPane) {
            map.invalidateSize();
          } else {
            try {
              map.invalidateSize();
            } catch {
              // ignore if container not ready
            }
          }
        } catch {
          // ignore
        }
      }, 200)
    );
  });

  useEffect(() => {
    if (!markerRef.current) return;
    markerRef.current.setLatLng([latitude, longitude]);
  }, [latitude, longitude]);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setFilePreviewUrls(urls);
    return () => {
      for (const u of urls) URL.revokeObjectURL(u);
    };
  }, [files]);

  function addFiles(nextFiles: File[]) {
    if (!nextFiles.length) return;
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}|${f.size}|${f.lastModified}`));
      const merged = [...prev];
      for (const f of nextFiles) {
        const key = `${f.name}|${f.size}|${f.lastModified}`;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(f);
      }
      return merged;
    });
  }

  function removeFileAt(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function getLocation() {
    setError("");
    setOk("");
    if (!navigator.geolocation) {
      setError("Géolocalisation non supportée");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setLatitude(lat);
        setLongitude(lng);
        const map = mapRef.current;
        if (map) map.setView([lat, lng], Math.max(map.getZoom(), 16));
      },
      () => setError("Impossible d'obtenir la position"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  /** Upload via notre API (contourne CORS Firebase Storage depuis localhost). */
  async function uploadSelectedPhotos(reportId: string): Promise<string[]> {
    if (!files.length) return [];
    const urls: string[] = [];
    for (const f of files) {
      const form = new FormData();
      form.append("file", f);
      const res = await fetch(`${API_BASE}/api/upload/photo/${reportId}`, {
        method: "POST",
        body: form
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message || `Upload échoué: ${res.status}`);
      }
      const data = (await res.json()) as { url: string };
      urls.push(data.url);
    }
    return urls;
  }

  async function submit() {
    setError("");
    setOk("");
    if (!user) {
      setError("Non connecté");
      return;
    }
    setLoading(true);
    try {
      // IMPORTANT: le backend "pull" attend que l'ID du document soit un UUID
      // (sinon il skip). Donc on crée le doc Firestore avec un ID UUID.
      const id = uuid();
      const photoUrls = await uploadSelectedPhotos(id);
      await setDoc(doc(firestore, "reports", id), {
        id,
        type,
        title: title.trim(),
        description: description.trim() || null,
        latitude,
        longitude,
        status: "NEW",
        surfaceM2: null,
        budgetAmount: null,
        progressPercent: null,
        photoUrls,
        userId: user.uid,
        createdAt: serverTimestamp()
      });
      rememberMyReportId(id);
      setOk("Signalement créé");
      setFiles([]);
    } catch (e: any) {
      setError(e?.message ?? "Erreur création");
    } finally {
      setLoading(false);
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Signaler</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonItem>
          <IonLabel position="stacked">Titre</IonLabel>
          <IonInput value={title} onIonInput={(e) => setTitle(e.detail.value ?? "")} />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Description</IonLabel>
          <IonTextarea value={description} onIonInput={(e) => setDescription(e.detail.value ?? "")} />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Latitude</IonLabel>
          <IonInput
            value={latitude}
            type="number"
            onIonInput={(e) => setLatitude(Number(e.detail.value ?? -18.8792))}
          />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Longitude</IonLabel>
          <IonInput
            value={longitude}
            type="number"
            onIonInput={(e) => setLongitude(Number(e.detail.value ?? 47.5079))}
          />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Type</IonLabel>
          <IonSelect value={type} onIonChange={(e) => setType(e.detail.value as ReportType)}>
            <IonSelectOption value="POTHOLE">Trou / nid de poule</IonSelectOption>
            <IonSelectOption value="ROADWORK">Travaux</IonSelectOption>
            <IonSelectOption value="FLOOD">Inondation</IonSelectOption>
            <IonSelectOption value="LANDSLIDE">Éboulement / glissement</IonSelectOption>
            <IonSelectOption value="OTHER">Autre</IonSelectOption>
          </IonSelect>
        </IonItem>

        <IonItem>
          <IonLabel position="stacked">Photos (1 ou plus)</IonLabel>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              const next = Array.from(e.target.files ?? []);
              addFiles(next);
              e.currentTarget.value = "";
            }}
            disabled={loading}
            style={{ paddingTop: 8, paddingBottom: 8 }}
          />
        </IonItem>

        {files.length ? (
          <div style={{ marginTop: 8, marginBottom: 12 }}>
            <IonText color="medium">
              <p style={{ marginTop: 0, marginBottom: 8 }}>{files.length} photo(s) sélectionnée(s)</p>
            </IonText>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 8
              }}
            >
              {filePreviewUrls.map((url, idx) => (
                <div
                  key={url}
                  style={{
                    border: "1px solid rgba(0,0,0,0.12)",
                    borderRadius: 10,
                    overflow: "hidden",
                    background: "#fff"
                  }}
                >
                  <div style={{ height: 86, width: "100%", background: "#f3f4f6" }}>
                    <img
                      src={url}
                      alt={`photo-${idx + 1}`}
                      style={{ height: "100%", width: "100%", objectFit: "cover", display: "block" }}
                    />
                  </div>
                  <div style={{ padding: 6 }}>
                    <IonButton
                      expand="block"
                      fill="outline"
                      size="small"
                      onClick={() => removeFileAt(idx)}
                      disabled={loading}
                    >
                      Retirer
                    </IonButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <IonText color="medium">
          <p style={{ marginTop: 6, marginBottom: 6 }}>Clique sur la carte pour choisir l’emplacement:</p>
        </IonText>
        <div style={{ height: 260, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(0,0,0,0.12)" }}>
          <div ref={mapEl} style={{ height: "100%", width: "100%" }} />
        </div>

        <IonButton expand="block" fill="outline" onClick={getLocation} disabled={loading}>
          Utiliser ma position
        </IonButton>
        <IonButton expand="block" onClick={submit} disabled={!canSubmit}>
          {loading ? "..." : "Créer"}
        </IonButton>

        {ok ? (
          <IonText color="success">
            <p>{ok}</p>
          </IonText>
        ) : null}
        {error ? (
          <IonText color="danger">
            <p>{error}</p>
          </IonText>
        ) : null}
      </IonContent>
    </IonPage>
  );
}

function rememberMyReportId(id: string) {
  try {
    const raw = localStorage.getItem(MY_REPORT_IDS_KEY);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    const set = new Set(Array.isArray(arr) ? arr : []);
    set.add(id);
    localStorage.setItem(MY_REPORT_IDS_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

function uuid(): string {
  // browsers récents
  const anyCrypto = globalThis.crypto as any;
  if (anyCrypto?.randomUUID) return anyCrypto.randomUUID();

  // fallback UUID v4
  // eslint-disable-next-line no-bitwise
  const rnd = () => ((Math.random() * 0xffffffff) | 0) >>> 0;
  const r1 = rnd();
  const r2 = rnd();
  const r3 = rnd();
  const r4 = rnd();
  const hex = (n: number, len: number) => n.toString(16).padStart(len, "0");
  return (
    `${hex(r1, 8)}-${hex(r2 >>> 16, 4)}-` +
    `${hex(((r2 >>> 0) & 0x0fff) | 0x4000, 4)}-` +
    `${hex(((r3 >>> 16) & 0x3fff) | 0x8000, 4)}-${hex(((r3 & 0xffff) << 16) | (r4 >>> 16), 8)}${hex(
      r4 & 0xffff,
      4
    )}`
  );
}

