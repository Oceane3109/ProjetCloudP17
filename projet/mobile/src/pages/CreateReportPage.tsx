import React, { useMemo, useState } from "react";
import {
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonText,
  IonTextarea,
  IonTitle,
  IonToolbar
} from "@ionic/react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { firestore } from "../firebase";
import { useAuth } from "../auth";

export default function CreateReportPage() {
  const { user } = useAuth();
  const [title, setTitle] = useState("Trou sur la route");
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState(-18.8792);
  const [longitude, setLongitude] = useState(47.5079);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const canSubmit = useMemo(() => !!user && title.trim().length > 0 && !loading, [user, title, loading]);

  function getLocation() {
    setError("");
    setOk("");
    if (!navigator.geolocation) {
      setError("Géolocalisation non supportée");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
      },
      () => setError("Impossible d'obtenir la position"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
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
      await addDoc(collection(firestore, "reports"), {
        title: title.trim(),
        description: description.trim() || null,
        latitude,
        longitude,
        status: "NEW",
        surfaceM2: null,
        budgetAmount: null,
        progressPercent: null,
        userId: user.uid,
        createdAt: serverTimestamp()
      });
      setOk("Signalement créé");
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

