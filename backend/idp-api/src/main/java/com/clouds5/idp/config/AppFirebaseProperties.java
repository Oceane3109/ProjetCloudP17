package com.clouds5.idp.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.firebase")
public class AppFirebaseProperties {
  /**
   * Active la synchronisation Firebase (Firestore). Désactivé par défaut pour éviter de casser
   * l'exécution si la clé n'est pas fournie.
   */
  private boolean enabled = false;

  /**
   * Chemin Resource vers le JSON de service account.
   *
   * <p>Exemples: {@code file:/run/secrets/firebase-service-account.json},
   * {@code file:C:/keys/firebase.json}</p>
   */
  private String serviceAccountPath;

  /** Optionnel: force le projectId (sinon pris depuis les credentials). */
  private String projectId;

  /** Collection Firestore utilisée pour les signalements. */
  private String reportsCollection = "reports";

  /** Bucket Storage pour les photos (ex: projectId.firebasestorage.app ou projectId.appspot.com). */
  private String storageBucket;

  public boolean isEnabled() {
    return enabled;
  }

  public void setEnabled(boolean enabled) {
    this.enabled = enabled;
  }

  public String getServiceAccountPath() {
    return serviceAccountPath;
  }

  public void setServiceAccountPath(String serviceAccountPath) {
    this.serviceAccountPath = serviceAccountPath;
  }

  public String getProjectId() {
    return projectId;
  }

  public void setProjectId(String projectId) {
    this.projectId = projectId;
  }

  public String getReportsCollection() {
    return reportsCollection;
  }

  public void setReportsCollection(String reportsCollection) {
    this.reportsCollection = reportsCollection;
  }

  public String getStorageBucket() {
    return storageBucket;
  }

  public void setStorageBucket(String storageBucket) {
    this.storageBucket = storageBucket;
  }
}

