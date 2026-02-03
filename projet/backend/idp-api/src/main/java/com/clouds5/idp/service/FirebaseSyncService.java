package com.clouds5.idp.service;

import com.clouds5.idp.config.AppFirebaseProperties;
import com.clouds5.idp.dto.SyncResultResponse;
import com.clouds5.idp.exception.ApiException;
import com.clouds5.idp.model.Report;
import com.clouds5.idp.model.ReportStatus;
import com.clouds5.idp.repo.ReportRepository;
import com.clouds5.idp.repo.UserRepository;
import com.google.api.core.ApiFuture;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.firestore.CollectionReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QuerySnapshot;
import com.google.cloud.firestore.WriteBatch;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.cloud.FirestoreClient;
import java.io.InputStream;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ExecutionException;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class FirebaseSyncService {
  private static final String APP_NAME = "idp-sync";

  private final AppFirebaseProperties firebaseProps;
  private final ReportRepository reports;
  private final UserRepository users;
  private final ResourceLoader resourceLoader;

  private volatile Firestore firestore;

  private Firestore firestore() {
    if (!firebaseProps.isEnabled()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "Firebase sync désactivée (app.firebase.enabled=false)");
    }
    if (firestore != null) return firestore;
    synchronized (this) {
      if (firestore != null) return firestore;
      firestore = initFirestore();
      return firestore;
    }
  }

  private Firestore initFirestore() {
    if (firebaseProps.getServiceAccountPath() == null || firebaseProps.getServiceAccountPath().isBlank()) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST, "app.firebase.serviceAccountPath manquant (ex: file:/.../firebase.json)");
    }
    try {
      Resource resource = resourceLoader.getResource(firebaseProps.getServiceAccountPath());
      if (!resource.exists()) {
        throw new ApiException(HttpStatus.BAD_REQUEST, "Fichier serviceAccount introuvable: " + firebaseProps.getServiceAccountPath());
      }

      try (InputStream in = resource.getInputStream()) {
        var creds = GoogleCredentials.fromStream(in);
        var builder = FirebaseOptions.builder().setCredentials(creds);
        if (firebaseProps.getProjectId() != null && !firebaseProps.getProjectId().isBlank()) {
          builder.setProjectId(firebaseProps.getProjectId().trim());
        }
        FirebaseOptions options = builder.build();

        FirebaseApp app =
            FirebaseApp.getApps().stream()
                .filter(a -> APP_NAME.equals(a.getName()))
                .findFirst()
                .orElseGet(() -> FirebaseApp.initializeApp(options, APP_NAME));

        return FirestoreClient.getFirestore(app);
      }
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Erreur initialisation Firebase");
    }
  }

  private CollectionReference reportsCollection() {
    String name = firebaseProps.getReportsCollection() == null || firebaseProps.getReportsCollection().isBlank()
        ? "reports"
        : firebaseProps.getReportsCollection().trim();
    return firestore().collection(name);
  }

  @Transactional(readOnly = true)
  public SyncResultResponse pushReportsToFirebase() {
    List<Report> all = reports.findAll();
    int processed = 0;
    int skipped = 0;
    int createdOrUpdated = 0;

    try {
      CollectionReference col = reportsCollection();
      WriteBatch batch = firestore().batch();
      int batchCount = 0;

      for (Report r : all) {
        processed++;
        if (r.getId() == null) {
          skipped++;
          continue;
        }

        Map<String, Object> doc = new HashMap<>();
        doc.put("title", r.getTitle());
        doc.put("description", r.getDescription());
        doc.put("latitude", r.getLatitude());
        doc.put("longitude", r.getLongitude());
        doc.put("status", r.getStatus() != null ? r.getStatus().name() : ReportStatus.NEW.name());
        doc.put("surfaceM2", r.getSurfaceM2() != null ? r.getSurfaceM2().toPlainString() : null);
        doc.put("budgetAmount", r.getBudgetAmount() != null ? r.getBudgetAmount().toPlainString() : null);
        doc.put("progressPercent", r.getProgressPercent());
        doc.put("userId", r.getUser() != null ? r.getUser().getId().toString() : null);
        doc.put("createdAt", r.getCreatedAt() != null ? Date.from(r.getCreatedAt()) : null);

        batch.set(col.document(r.getId().toString()), doc);
        batchCount++;
        createdOrUpdated++;

        if (batchCount >= 450) {
          batch.commit().get();
          batch = firestore().batch();
          batchCount = 0;
        }
      }

      if (batchCount > 0) batch.commit().get();
      return new SyncResultResponse(processed, 0, createdOrUpdated, skipped);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Firebase push interrompu");
    } catch (ExecutionException e) {
      throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Erreur Firebase push");
    }
  }

  @Transactional
  public SyncResultResponse pullReportsFromFirebase() {
    try {
      ApiFuture<QuerySnapshot> fut = reportsCollection().get();
      var snap = fut.get();
      int processed = 0;
      int created = 0;
      int updated = 0;
      int skipped = 0;

      for (DocumentSnapshot doc : snap.getDocuments()) {
        processed++;
        UUID id;
        try {
          id = UUID.fromString(doc.getId());
        } catch (Exception e) {
          skipped++;
          continue;
        }

        Report r = reports.findById(id).orElseGet(() -> {
          Report nr = new Report();
          nr.setId(id);
          return nr;
        });
        boolean isNew = r.getCreatedAt() == null;

        r.setTitle(asString(doc.get("title"), "Sans titre"));
        r.setDescription(asStringOrNull(doc.get("description")));
        r.setLatitude(asDouble(doc.get("latitude"), 0));
        r.setLongitude(asDouble(doc.get("longitude"), 0));
        r.setStatus(parseStatus(asString(doc.get("status"), ReportStatus.NEW.name())));
        r.setSurfaceM2(asBigDecimalOrNull(doc.get("surfaceM2")));
        r.setBudgetAmount(asBigDecimalOrNull(doc.get("budgetAmount")));
        r.setProgressPercent(asIntegerOrNull(doc.get("progressPercent")));

        // userId optionnel (si présent, on rattache seulement si l'utilisateur existe)
        String userIdStr = asStringOrNull(doc.get("userId"));
        if (userIdStr != null) {
          try {
            UUID userId = UUID.fromString(userIdStr);
            users.findById(userId).ifPresent(r::setUser);
          } catch (Exception ignored) {
            // ignore
          }
        }

        Instant createdAt = asInstantOrNull(doc.get("createdAt"));
        if (createdAt != null) r.setCreatedAt(createdAt);

        reports.save(r);
        if (isNew) created++;
        else updated++;
      }

      return new SyncResultResponse(processed, created, updated, skipped);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Firebase pull interrompu");
    } catch (ExecutionException e) {
      throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Erreur Firebase pull");
    }
  }

  private static String asString(Object v, String def) {
    if (v == null) return def;
    String s = v.toString();
    return s.isBlank() ? def : s;
  }

  private static String asStringOrNull(Object v) {
    if (v == null) return null;
    String s = v.toString();
    return s.isBlank() ? null : s;
  }

  private static double asDouble(Object v, double def) {
    if (v == null) return def;
    if (v instanceof Number n) return n.doubleValue();
    try {
      return Double.parseDouble(v.toString());
    } catch (Exception e) {
      return def;
    }
  }

  private static Integer asIntegerOrNull(Object v) {
    if (v == null) return null;
    if (v instanceof Number n) return n.intValue();
    try {
      return Integer.parseInt(v.toString());
    } catch (Exception e) {
      return null;
    }
  }

  private static BigDecimal asBigDecimalOrNull(Object v) {
    if (v == null) return null;
    if (v instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
    try {
      String s = v.toString().trim();
      if (s.isBlank()) return null;
      return new BigDecimal(s);
    } catch (Exception e) {
      return null;
    }
  }

  private static Instant asInstantOrNull(Object v) {
    if (v == null) return null;
    if (v instanceof Date d) return d.toInstant();
    // firebase Timestamp -> toDate()
    try {
      var m = v.getClass().getMethod("toDate");
      Object res = m.invoke(v);
      if (res instanceof Date d) return d.toInstant();
    } catch (Exception ignored) {
      // ignore
    }
    try {
      return Instant.parse(v.toString());
    } catch (Exception e) {
      return null;
    }
  }

  private static ReportStatus parseStatus(String raw) {
    try {
      return ReportStatus.valueOf(raw);
    } catch (Exception e) {
      return ReportStatus.NEW;
    }
  }
}

