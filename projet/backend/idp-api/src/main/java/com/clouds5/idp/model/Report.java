package com.clouds5.idp.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "reports")
public class Report {
  @Id private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id")
  private User user;

  @Column(nullable = false, length = 200)
  private String title;

  @Column(columnDefinition = "text")
  private String description;

  @Column(name = "latitude", nullable = false)
  private double latitude;

  @Column(name = "longitude", nullable = false)
  private double longitude;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private ReportStatus status = ReportStatus.NEW;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private ReportType type = ReportType.OTHER;

  @Column(name = "company_name", length = 200)
  private String companyName;

  @jakarta.persistence.Convert(converter = StringListJsonConverter.class)
  @Column(name = "photo_urls", columnDefinition = "text")
  private List<String> photoUrls = new ArrayList<>();

  @Column(name = "surface_m2", precision = 12, scale = 2)
  private BigDecimal surfaceM2;

  @Column(name = "budget_amount", precision = 14, scale = 2)
  private BigDecimal budgetAmount;

  @Column(name = "progress_percent")
  private Integer progressPercent;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "status_new_at")
  private Instant statusNewAt;

  @Column(name = "status_in_progress_at")
  private Instant statusInProgressAt;

  @Column(name = "status_done_at")
  private Instant statusDoneAt;

  @PrePersist
  void onCreate() {
    if (id == null) id = UUID.randomUUID();
    if (createdAt == null) createdAt = Instant.now();
    if (statusNewAt == null) statusNewAt = createdAt;
  }
}

