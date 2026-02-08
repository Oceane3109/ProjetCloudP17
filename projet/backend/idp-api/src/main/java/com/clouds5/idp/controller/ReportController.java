package com.clouds5.idp.controller;

import com.clouds5.idp.dto.CreateReportRequest;
import com.clouds5.idp.dto.ReportResponse;
import com.clouds5.idp.dto.UpdateReportRequest;
import com.clouds5.idp.dto.UpdateReportStatusRequest;
import com.clouds5.idp.model.Role;
import com.clouds5.idp.model.Report;
import com.clouds5.idp.security.UserPrincipal;
import com.clouds5.idp.service.ReportService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {
  private final ReportService reportService;

  @GetMapping
  public ResponseEntity<List<ReportResponse>> listAll() {
    return ResponseEntity.ok(reportService.listAll().stream().map(ReportController::toDto).toList());
  }

  @GetMapping("/mine")
  @SecurityRequirement(name = "bearerAuth")
  public ResponseEntity<List<ReportResponse>> mine(@AuthenticationPrincipal UserPrincipal principal) {
    return ResponseEntity.ok(reportService.listMine(principal.id()).stream().map(ReportController::toDto).toList());
  }

  @PostMapping
  @SecurityRequirement(name = "bearerAuth")
  public ResponseEntity<ReportResponse> create(
      @AuthenticationPrincipal UserPrincipal principal, @Valid @RequestBody CreateReportRequest req) {
    return ResponseEntity.ok(toDto(reportService.create(principal.id(), req)));
  }

  @PatchMapping("/{id}/status")
  @SecurityRequirement(name = "bearerAuth")
  @PreAuthorize("hasRole('MANAGER')")
  public ResponseEntity<ReportResponse> updateStatus(
      @PathVariable("id") UUID reportId, @Valid @RequestBody UpdateReportStatusRequest req) {
    return ResponseEntity.ok(toDto(reportService.updateStatus(reportId, req.status())));
  }

  @PatchMapping("/{id}")
  @SecurityRequirement(name = "bearerAuth")
  @PreAuthorize("hasRole('MANAGER')")
  public ResponseEntity<ReportResponse> update(
      @PathVariable("id") UUID reportId, @Valid @RequestBody UpdateReportRequest req) {
    return ResponseEntity.ok(toDto(reportService.update(reportId, req)));
  }

  @DeleteMapping("/{id}")
  @SecurityRequirement(name = "bearerAuth")
  public ResponseEntity<Void> delete(
      @AuthenticationPrincipal UserPrincipal principal, @PathVariable("id") UUID reportId) {
    reportService.delete(reportId, principal.id(), principal.role() == Role.MANAGER);
    return ResponseEntity.noContent().build();
  }

  private static ReportResponse toDto(Report r) {
    return new ReportResponse(
        r.getId(),
        r.getUser() != null ? r.getUser().getId() : null,
        r.getType() != null ? r.getType().name() : "OTHER",
        r.getCompanyName(),
        r.getPhotoUrls() != null ? r.getPhotoUrls() : java.util.List.of(),
        r.getTitle(),
        r.getDescription(),
        r.getLatitude(),
        r.getLongitude(),
        r.getStatus().name(),
        r.getSurfaceM2(),
        r.getBudgetAmount(),
        r.getProgressPercent(),
        r.getCreatedAt(),
        r.getStatusNewAt(),
        r.getStatusInProgressAt(),
        r.getStatusDoneAt());
  }
}

