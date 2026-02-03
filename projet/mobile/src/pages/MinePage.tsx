import React, { useEffect, useMemo, useState } from "react";
import { IonButton, IonContent, IonHeader, IonList, IonItem, IonLabel, IonPage, IonText, IonTitle, IonToolbar } from "@ionic/react";
import { collection, deleteDoc, doc, onSnapshot, query, where } from "firebase/firestore";
import { firestore } from "../firebase";
import { useAuth } from "../auth";
import type { Report } from "../types";

export default function MinePage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<Report[]>([]);
  const [error, setError] = useState("");

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
        <IonText>
          <p>
            Total: <b>{items.length}</b> — NEW: <b>{countBy.NEW}</b> — IN_PROGRESS: <b>{countBy.IN_PROGRESS}</b> — DONE:{" "}
            <b>{countBy.DONE}</b>
          </p>
        </IonText>
        {error ? (
          <IonText color="danger">
            <p>{error}</p>
          </IonText>
        ) : null}
        <IonList>
          {items.map((r) => (
            <IonItem key={r.id}>
              <IonLabel>
                <h2>{r.title}</h2>
                <p>
                  {r.status} — {r.latitude.toFixed(5)}, {r.longitude.toFixed(5)}
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

