import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonList,
  IonItem,
  IonLabel,
  IonPage,
  IonText,
  IonTitle,
  IonToast,
  IonToolbar
} from "@ionic/react";
import { collection, deleteDoc, doc, onSnapshot, query, where } from "firebase/firestore";
import { firestore } from "../firebase";
import { useAuth } from "../auth";
import type { Report } from "../types";

export default function MinePage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<Report[]>([]);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ open: boolean; message: string }>({ open: false, message: "" });
  const prevStatusRef = useRef<Record<string, string>>({});

  const uid = user?.uid ?? "";

  useEffect(() => {
    if (loading) return;
    if (!uid) return;
    setError("");
    // Sans orderBy pour éviter une indexation composite obligatoire côté Firestore
    const q = query(collection(firestore, "reports"), where("userId", "==", uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const next: Report[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        // notification simple quand le status change (si l'app est ouverte)
        const prev = prevStatusRef.current;
        for (const r of next) {
          const p = prev[r.id];
          if (p && p !== r.status) {
            setToast({ open: true, message: `Status changé: "${r.title}" → ${r.status}` });
          }
          prev[r.id] = r.status;
        }
        setItems(next);
      },
      () => setError("Erreur lecture Firestore")
    );
    return () => unsub();
  }, [uid, loading]);

  const countBy = useMemo(() => {
    const by = { NEW: 0, IN_PROGRESS: 0, DONE: 0 };
    for (const r of items) {
      if (r.status === "NEW") by.NEW++;
      else if (r.status === "IN_PROGRESS") by.IN_PROGRESS++;
      else if (r.status === "DONE") by.DONE++;
    }
    return by;
  }, [items]);

  function statusColor(s: string): "danger" | "warning" | "success" | "medium" {
    if (s === "DONE") return "success";
    if (s === "IN_PROGRESS") return "warning";
    if (s === "NEW") return "danger";
    return "medium";
  }

  async function remove(id: string) {
    setError("");
    try {
      await deleteDoc(doc(firestore, "reports", id));
    } catch (e: any) {
      setError(e?.message ?? "Erreur suppression");
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Mes signalements</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonToast
          isOpen={toast.open}
          header="Changement de statut"
          message={toast.message}
          position="middle"
          color="primary"
          cssClass="big-center-toast"
          duration={6000}
          buttons={[{ text: "OK", role: "cancel" }]}
          onDidDismiss={() => setToast({ open: false, message: "" })}
        />
        <IonCard style={{ borderRadius: 18 }}>
          <IonCardContent>
            <IonText color="dark">
              <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>Résumé</div>
            </IonText>
            <IonText color="medium">
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 13 }}>
                <span>
                  Total: <b>{items.length}</b>
                </span>
                <span>
                  NEW: <b>{countBy.NEW}</b>
                </span>
                <span>
                  IN_PROGRESS: <b>{countBy.IN_PROGRESS}</b>
                </span>
                <span>
                  DONE: <b>{countBy.DONE}</b>
                </span>
              </div>
            </IonText>
          </IonCardContent>
        </IonCard>
        {error ? (
          <IonText color="danger">
            <p>{error}</p>
          </IonText>
        ) : null}
        <IonList>
          {items.map((r) => (
            <IonItem key={r.id}>
              <IonLabel>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>{r.title}</h2>
                  <IonText color={statusColor(r.status)}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 900,
                        padding: "4px 8px",
                        borderRadius: 999,
                        border: "1px solid rgba(15,23,42,0.12)",
                        background: "rgba(15,23,42,0.04)",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {r.status}
                    </span>
                  </IonText>
                </div>
                <p style={{ marginTop: 6 }}>
                  {r.latitude.toFixed(5)}, {r.longitude.toFixed(5)}
                </p>
              </IonLabel>
              <IonButton slot="end" color="danger" fill="outline" onClick={() => remove(r.id)}>
                Supprimer
              </IonButton>
            </IonItem>
          ))}
        </IonList>
      </IonContent>
    </IonPage>
  );
}

