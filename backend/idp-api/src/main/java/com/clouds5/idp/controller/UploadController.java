package com.clouds5.idp.controller;

import com.clouds5.idp.service.LocalUploadService;
import com.clouds5.idp.service.FirebaseStorageUploadService;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequestMapping("/api/upload")
@RequiredArgsConstructor
public class UploadController {

  private final FirebaseStorageUploadService uploadService;
  private final LocalUploadService localUploadService;

  /**
   * Upload une photo pour un signalement. Contourne le CORS du navigateur (mobile sur localhost).
   * Pas d'auth requise pour permettre l'app mobile (Firebase Auth) d'envoyer les fichiers.
   */
  @PostMapping(value = "/photo/{reportId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<Map<String, String>> uploadPhoto(
      @PathVariable String reportId,
      @RequestParam("file") MultipartFile file) {
    if (file.isEmpty()) {
      return ResponseEntity.badRequest().body(Map.of("error", "Fichier vide"));
    }
    try {
      String url = uploadService.uploadPhoto(reportId, file);
      return ResponseEntity.ok(Map.of("url", url));
    } catch (Exception e) {
      String rel = localUploadService.saveReportPhoto(reportId, file);
      String absolute =
          ServletUriComponentsBuilder.fromCurrentContextPath().path(rel).toUriString();
      return ResponseEntity.ok(Map.of("url", absolute));
    }
  }
}
