package com.clouds5.idp.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.math.BigDecimal;

/**
 * Mise à jour manager (partielle) d'un signalement.
 *
 * <p>Tous les champs sont optionnels (PATCH).</p>
 */
public record UpdateReportRequest(
    String status,
    String type,
    String companyName,
    @DecimalMin("0") BigDecimal surfaceM2,
    @DecimalMin("0") BigDecimal budgetAmount,
    @Min(1) @Max(10) Integer level,
    @Min(0) @Max(100) Integer progressPercent) {}

