package com.clouds5.idp.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateReportStatusRequest(@NotBlank String status) {}

