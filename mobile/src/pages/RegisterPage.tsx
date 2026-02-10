import React, { useState } from "react";
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
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
      <IonContent fullscreen>
        <div
          style={{
            minHeight: "100%",
            display: "grid",
            placeItems: "center",
            padding: 16
          }}
        >
          <IonCard style={{ width: "min(520px, 96vw)", borderRadius: 18 }}>
            <IonCardHeader>
              <IonCardTitle style={{ fontSize: 18, fontWeight: 800 }}>Créer un compte</IonCardTitle>
              <IonText color="medium">
                <p style={{ marginTop: 6, marginBottom: 0 }}>
                  Tu pourras ensuite te connecter et publier tes signalements.
                </p>
              </IonText>
            </IonCardHeader>
            <IonCardContent>
              <IonItem lines="full">
                <IonLabel position="stacked">Email</IonLabel>
                <IonInput
                  value={email}
                  type="email"
                  inputMode="email"
                  autocomplete="username"
                  onIonInput={(e) => setEmail(e.detail.value ?? "")}
                />
              </IonItem>
              <IonItem lines="full">
                <IonLabel position="stacked">Mot de passe</IonLabel>
                <IonInput
                  value={password}
                  type="password"
                  autocomplete="new-password"
                  onIonInput={(e) => setPassword(e.detail.value ?? "")}
                />
              </IonItem>

              {error ? (
                <IonText color="danger">
                  <p style={{ marginTop: 10, marginBottom: 0 }}>{error}</p>
                </IonText>
              ) : null}

              <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                <IonButton expand="block" onClick={submit} disabled={loading}>
                  {loading ? "..." : "Créer"}
                </IonButton>
                <IonButton expand="block" fill="outline" routerLink="/login">
                  Retour
                </IonButton>
              </div>
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  );
}

