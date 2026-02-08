package com.clouds5.idp.service;

import com.clouds5.idp.dto.CreateReportRequest;
import com.clouds5.idp.dto.UpdateReportRequest;
import com.clouds5.idp.exception.ApiException;
import com.clouds5.idp.model.Report;
import com.clouds5.idp.model.ReportStatus;
import com.clouds5.idp.model.ReportType;
import com.clouds5.idp.repo.ReportRepository;
import com.clouds5.idp.repo.UserRepository;
import java.text.Normalizer;
import java.time.Instant;
import java.util.Locale;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ReportService {
  private final ReportRepository reports;
  private final UserRepository users;

  public List<Report> listAll() {
    return reports.findAll();
  }

  public List<Report> listMine(UUID userId) {
    return reports.findAllByUser_Id(userId);
  }

  @Transactional
  public Report create(UUID userId, CreateReportRequest req) {
    var user =
        users.findById(userId).orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Utilisateur introuvable"));
    var r = new Report();
    r.setUser(user);
    r.setTitle(req.title());
    r.setDescription(req.description());
    r.setLatitude(req.latitude());
    r.setLongitude(req.longitude());
    applyStatus(r, ReportStatus.NEW, Instant.now());
    r.setType(parseOrInferType(req.type(), req.title()));
    if (req.surfaceM2() != null) r.setSurfaceM2(req.surfaceM2());
    if (req.budgetAmount() != null) r.setBudgetAmount(req.budgetAmount());
    return reports.save(r);
  }

  private static ReportType parseOrInferType(String raw, String title) {
    if (raw != null && !raw.isBlank()) {
      try {
        return ReportType.valueOf(raw.trim().toUpperCase(Locale.ROOT));
      } catch (Exception e) {
        throw new ApiException(
            HttpStatus.BAD_REQUEST,
            "Type invalide (POTHOLE, ROADWORK, FLOOD, LANDSLIDE, OTHER)");
      }
    }
    return inferTypeFromTitle(title);
  }

  private static ReportType inferTypeFromTitle(String title) {
    if (title == null) return ReportType.OTHER;
    String t =
        Normalizer.normalize(title, Normalizer.Form.NFD)
            .replaceAll("\\p{M}+", "")
            .toLowerCase(Locale.ROOT);

    // FR + variantes
    if (t.contains("trou") || t.contains("nid de poule") || t.contains("pothole")) return ReportType.POTHOLE;
    if (t.contains("travaux") || t.contains("chantier") || t.contains("work")) return ReportType.ROADWORK;
    if (t.contains("inond") || t.contains("flood")) return ReportType.FLOOD;
    if (t.contains("eboul") || t.contains("ecroul") || t.contains("glissement") || t.contains("landslide"))
      return ReportType.LANDSLIDE;

    return ReportType.OTHER;
  }

  @Transactional
  public Report updateStatus(UUID reportId, String status) {
    var r =
        reports.findById(reportId).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Signalement introuvable"));
    try {
      applyStatus(r, ReportStatus.valueOf(status), Instant.now());
    } catch (Exception e) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "Status invalide (NEW, IN_PROGRESS, DONE)");
    }
    return reports.save(r);
  }

  @Transactional
  public Report update(UUID reportId, UpdateReportRequest req) {
    var r =
        reports.findById(reportId).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Signalement introuvable"));

    if (req.status() != null && !req.status().isBlank()) {
      try {
        applyStatus(r, ReportStatus.valueOf(req.status()), Instant.now());
      } catch (Exception e) {
        throw new ApiException(HttpStatus.BAD_REQUEST, "Status invalide (NEW, IN_PROGRESS, DONE)");
      }
    }
    if (req.type() != null && !req.type().isBlank()) {
      r.setType(parseOrInferType(req.type(), r.getTitle()));
    }
    if (req.companyName() != null) {
      var cn = req.companyName().trim();
      r.setCompanyName(cn.isBlank() ? null : cn);
    }
    if (req.surfaceM2() != null) r.setSurfaceM2(req.surfaceM2());
    if (req.budgetAmount() != null) r.setBudgetAmount(req.budgetAmount());
    // progressPercent est déterminé par status (règle du sujet)

    return reports.save(r);
  }

  private static void applyStatus(Report r, ReportStatus next, Instant now) {
    if (next == null) return;
    r.setStatus(next);
    if (next == ReportStatus.NEW) {
      if (r.getStatusNewAt() == null) r.setStatusNewAt(now);
      r.setProgressPercent(0);
    } else if (next == ReportStatus.IN_PROGRESS) {
      if (r.getStatusInProgressAt() == null) r.setStatusInProgressAt(now);
      if (r.getStatusNewAt() == null) r.setStatusNewAt(now);
      r.setProgressPercent(50);
    } else if (next == ReportStatus.DONE) {
      if (r.getStatusDoneAt() == null) r.setStatusDoneAt(now);
      if (r.getStatusInProgressAt() == null) r.setStatusInProgressAt(now);
      if (r.getStatusNewAt() == null) r.setStatusNewAt(now);
      r.setProgressPercent(100);
    }
  }

  @Transactional
  public void delete(UUID reportId, UUID requesterId, boolean requesterIsManager) {
    var r =
        reports.findById(reportId).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Signalement introuvable"));

    if (!requesterIsManager) {
      if (r.getUser() == null || !r.getUser().getId().equals(requesterId)) {
        throw new ApiException(HttpStatus.FORBIDDEN, "Accès refusé");
      }
    }

    reports.delete(r);
  }
}

