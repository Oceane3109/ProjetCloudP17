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
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

@Getter
@Setter
@Entity
@Table(name = "reports")
public class Report {
  @Id @UuidGenerator private UUID id;

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

  @Column(name = "surface_m2", precision = 12, scale = 2)
  private BigDecimal surfaceM2;

  @Column(name = "budget_amount", precision = 14, scale = 2)
  private BigDecimal budgetAmount;

  @Column(name = "progress_percent")
  private Integer progressPercent;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @PrePersist
  void onCreate() {
    if (createdAt == null) createdAt = Instant.now();
  }
}

