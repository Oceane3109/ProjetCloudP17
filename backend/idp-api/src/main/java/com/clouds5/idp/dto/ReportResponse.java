package com.clouds5.idp.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ReportResponse(
    UUID id,
    UUID userId,
    String type,
    String companyName,
    List<String> photoUrls,
    String title,
    String description,
    double latitude,
    double longitude,
    String status,
    BigDecimal surfaceM2,
    BigDecimal budgetAmount,
    Integer level,
    Integer progressPercent,
    Instant createdAt,
    Instant statusNewAt,
    Instant statusInProgressAt,
    Instant statusDoneAt) {}

