package com.clouds5.idp.controller;

import com.clouds5.idp.dto.SyncResultResponse;
import com.clouds5.idp.service.FirebaseSyncService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/sync/firebase/reports")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasRole('MANAGER')")
public class FirebaseSyncController {
  private final FirebaseSyncService syncService;

  /** Backend -> Firebase */
  @PostMapping("/push")
  public ResponseEntity<SyncResultResponse> push() {
    return ResponseEntity.ok(syncService.pushReportsToFirebase());
  }

  /** Firebase -> Backend */
  @PostMapping("/pull")
  public ResponseEntity<SyncResultResponse> pull() {
    return ResponseEntity.ok(syncService.pullReportsFromFirebase());
  }
}

