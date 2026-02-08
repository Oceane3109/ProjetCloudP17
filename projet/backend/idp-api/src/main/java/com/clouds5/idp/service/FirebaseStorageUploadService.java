package com.clouds5.idp.service;

import com.clouds5.idp.config.AppFirebaseProperties;
import com.clouds5.idp.exception.ApiException;
import com.google.cloud.storage.Blob;
import com.google.cloud.storage.Bucket;
import com.google.cloud.storage.Bucket.BlobTargetOption;
import com.google.cloud.storage.Storage;
import com.google.firebase.FirebaseApp;
import com.google.firebase.cloud.StorageClient;
import java.nio.charset.StandardCharsets;
import java.net.URLEncoder;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class FirebaseStorageUploadService {

  private static final Logger log = LoggerFactory.getLogger(FirebaseStorageUploadService.class);
  private static final String APP_NAME = "idp-sync";

  private final AppFirebaseProperties firebaseProps;
  private final FirebaseSyncService firebaseSyncService;

  /**
   * Upload vers Firebase Storage et retourne l'URL publique (pas d'URL signée = pas d'erreur signing).
   */
  public String uploadPhoto(String reportId, MultipartFile file) {
    try {
      if (!firebaseProps.isEnabled()) {
        throw new ApiException(HttpStatus.BAD_REQUEST, "Firebase désactivé");
      }
      String bucketName = firebaseProps.getStorageBucket();
      if (bucketName == null || bucketName.isBlank()) {
        throw new ApiException(HttpStatus.BAD_REQUEST, "Configuration Firebase: 'app.firebase.storageBucket' est manquant ou vide. Définissez APP_FIREBASE_STORAGE_BUCKET avec le nom exact du bucket (ex: project-id.appspot.com).");
      }

      firebaseSyncService.ensureInitialized();
      FirebaseApp app =
          FirebaseApp.getApps().stream()
              .filter(a -> APP_NAME.equals(a.getName()))
              .findFirst()
              .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Firebase non initialisé"));

      Bucket bucket = resolveBucket(app, bucketName);

      String safeName = file.getOriginalFilename() != null
          ? file.getOriginalFilename().replaceAll("\\s+", "_")
          : "photo";
      String path = "reports/" + reportId + "/" + System.currentTimeMillis() + "_" + safeName;

      Blob blob = bucket.create(path, file.getBytes(), BlobTargetOption.predefinedAcl(Storage.PredefinedAcl.PUBLIC_READ));
      String encodedPath = URLEncoder.encode(path, StandardCharsets.UTF_8).replace("+", "%20");
      String finalBucketName = bucket.getName() != null && !bucket.getName().isBlank() ? bucket.getName() : bucketName;
      return "https://firebasestorage.googleapis.com/v0/b/" + finalBucketName + "/o/" + encodedPath + "?alt=media";
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      log.warn("Upload photo failed: {}", e.getMessage(), e);
      throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Erreur upload: " + (e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName()));
    }
  }

  private Bucket resolveBucket(FirebaseApp app, String bucketName) {
    try {
      Bucket bucket = StorageClient.getInstance(app).bucket(bucketName.trim());
      if (bucket != null) return bucket;
    } catch (Exception e) {
      if (bucketName != null
          && bucketName.endsWith(".firebasestorage.app")
          && !bucketName.endsWith(".appspot.com")) {
        String fallback = bucketName.replace(".firebasestorage.app", ".appspot.com");
        try {
          Bucket bucket = StorageClient.getInstance(app).bucket(fallback);
          if (bucket != null) return bucket;
        } catch (Exception ignored) {
          // handled below
        }
      }

      String msg = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
      throw new ApiException(
          HttpStatus.BAD_REQUEST,
          "Bucket Firebase Storage introuvable ou inaccessible. Vérifie APP_FIREBASE_STORAGE_BUCKET (souvent: <project-id>.appspot.com). Détail: "
              + msg);
    }

    throw new ApiException(
        HttpStatus.BAD_REQUEST,
        "Bucket Firebase Storage non configuré. Vérifie APP_FIREBASE_STORAGE_BUCKET (souvent: <project-id>.appspot.com)."
    );
  }
}
