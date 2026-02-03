import React from "react";
import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs
} from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import { Redirect, Route } from "react-router-dom";
import { mapOutline, addCircleOutline, personOutline } from "ionicons/icons";
import { AuthProvider, useAuth } from "./auth";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import MapPage from "./pages/MapPage";
import CreateReportPage from "./pages/CreateReportPage";
import MinePage from "./pages/MinePage";

function PrivateTabs() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Redirect to="/login" />;

  return (
    <IonTabs>
      <IonRouterOutlet>
        <Route exact path="/tabs/map" component={MapPage} />
        <Route exact path="/tabs/create" component={CreateReportPage} />
        <Route exact path="/tabs/mine" component={MinePage} />
        <Route exact path="/tabs" render={() => <Redirect to="/tabs/map" />} />
      </IonRouterOutlet>

      <IonTabBar slot="bottom">
        <IonTabButton tab="map" href="/tabs/map">
          <IonIcon icon={mapOutline} />
          <IonLabel>Carte</IonLabel>
        </IonTabButton>
        <IonTabButton tab="create" href="/tabs/create">
          <IonIcon icon={addCircleOutline} />
          <IonLabel>Signaler</IonLabel>
        </IonTabButton>
        <IonTabButton tab="mine" href="/tabs/mine">
          <IonIcon icon={personOutline} />
          <IonLabel>Mes</IonLabel>
        </IonTabButton>
      </IonTabBar>
    </IonTabs>
  );
}

export default function App() {
  return (
    <IonApp>
      <AuthProvider>
        <IonReactRouter>
          <IonRouterOutlet>
            <Route exact path="/login" component={LoginPage} />
            <Route exact path="/register" component={RegisterPage} />
            <Route path="/tabs" component={PrivateTabs} />
            <Route exact path="/" render={() => <Redirect to="/tabs" />} />
          </IonRouterOutlet>
        </IonReactRouter>
      </AuthProvider>
    </IonApp>
  );
}

