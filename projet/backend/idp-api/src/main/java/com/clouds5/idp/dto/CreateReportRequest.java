package com.clouds5.idp.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateReportRequest(
    @NotBlank @Size(max = 200) String title,
    @Size(max = 5000) String description,
    @NotNull @Min(-90) @Max(90) Double latitude,
    @NotNull @Min(-180) @Max(180) Double longitude) {}

