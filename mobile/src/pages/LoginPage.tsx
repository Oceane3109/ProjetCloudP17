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
import { signInWithEmailAndPassword } from "firebase/auth";
import { firebaseAuth } from "../firebase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
      window.location.href = "/tabs";
    } catch (e: any) {
      setError(e?.message ?? "Erreur login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Connexion</IonTitle>
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
              <IonCardTitle style={{ fontSize: 18, fontWeight: 800 }}>Bienvenue</IonCardTitle>
              <IonText color="medium">
                <p style={{ marginTop: 6, marginBottom: 0 }}>Connecte-toi pour voir la carte et tes signalements.</p>
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
                  autocomplete="current-password"
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
                  {loading ? "..." : "Se connecter"}
                </IonButton>
                <IonButton expand="block" fill="outline" routerLink="/register">
                  Créer un compte
                </IonButton>
              </div>
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  );
}

