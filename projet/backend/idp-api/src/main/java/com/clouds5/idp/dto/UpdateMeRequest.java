package com.clouds5.idp.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

public record UpdateMeRequest(
    @Email String email,
    @Size(min = 6, max = 100) String password) {}

