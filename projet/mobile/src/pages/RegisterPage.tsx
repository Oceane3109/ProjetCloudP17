import React, { useState } from "react";
import {
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonText,
  IonTitle,
  IonToolbar
} from "@ionic/react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { firebaseAuth } from "../firebase";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError("");
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password);
      window.location.href = "/tabs";
    } catch (e: any) {
      setError(e?.message ?? "Erreur register");
    } finally {
      setLoading(false);
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Créer un compte</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonItem>
          <IonLabel position="stacked">Email</IonLabel>
          <IonInput value={email} type="email" onIonInput={(e) => setEmail(e.detail.value ?? "")} />
        </IonItem>
        <IonItem>
          <IonLabel position="stacked">Mot de passe</IonLabel>
          <IonInput
            value={password}
            type="password"
            onIonInput={(e) => setPassword(e.detail.value ?? "")}
          />
        </IonItem>

        {error ? (
          <IonText color="danger">
            <p>{error}</p>
          </IonText>
        ) : null}

        <IonButton expand="block" onClick={submit} disabled={loading}>
          {loading ? "..." : "Créer"}
        </IonButton>
        <IonButton expand="block" fill="clear" routerLink="/login">
          Retour
        </IonButton>
      </IonContent>
    </IonPage>
  );
}

