package com.clouds5.idp.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ReportResponse(
    UUID id,
    UUID userId,
    String title,
    String description,
    double latitude,
    double longitude,
    String status,
    BigDecimal surfaceM2,
    BigDecimal budgetAmount,
    Integer progressPercent,
    Instant createdAt) {}

