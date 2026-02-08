package com.clouds5.idp.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import jakarta.validation.constraints.DecimalMin;

public record CreateReportRequest(
    @NotBlank @Size(max = 200) String title,
    @Size(max = 5000) String description,
    @NotNull @Min(-90) @Max(90) Double latitude,
    @NotNull @Min(-180) @Max(180) Double longitude,
    /**
     * Type métier (ex: POTHOLE, ROADWORK, FLOOD, LANDSLIDE, OTHER).
     * Optionnel (défaut: inféré depuis le titre, sinon OTHER).
     */
    String type,
    @DecimalMin("0") BigDecimal surfaceM2,
    @DecimalMin("0") BigDecimal budgetAmount,
    @Min(0) @Max(100) Integer progressPercent) {}

