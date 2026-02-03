package com.clouds5.idp.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record UnlockByEmailRequest(@Email @NotBlank String email) {}

