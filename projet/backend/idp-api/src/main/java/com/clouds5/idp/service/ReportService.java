package com.clouds5.idp.service;

import com.clouds5.idp.dto.CreateReportRequest;
import com.clouds5.idp.dto.UpdateReportRequest;
import com.clouds5.idp.exception.ApiException;
import com.clouds5.idp.model.Report;
import com.clouds5.idp.model.ReportStatus;
import com.clouds5.idp.repo.ReportRepository;
import com.clouds5.idp.repo.UserRepository;
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
    r.setStatus(ReportStatus.NEW);
    return reports.save(r);
  }

  @Transactional
  public Report updateStatus(UUID reportId, String status) {
    var r =
        reports.findById(reportId).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Signalement introuvable"));
    try {
      r.setStatus(ReportStatus.valueOf(status));
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
        r.setStatus(ReportStatus.valueOf(req.status()));
      } catch (Exception e) {
        throw new ApiException(HttpStatus.BAD_REQUEST, "Status invalide (NEW, IN_PROGRESS, DONE)");
      }
    }
    if (req.surfaceM2() != null) r.setSurfaceM2(req.surfaceM2());
    if (req.budgetAmount() != null) r.setBudgetAmount(req.budgetAmount());
    if (req.progressPercent() != null) r.setProgressPercent(req.progressPercent());

    return reports.save(r);
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

