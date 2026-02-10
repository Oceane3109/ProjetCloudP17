package com.clouds5.idp.dto;

import java.time.Instant;

public record AuthResponse(String accessToken, Instant expiresAt, String role) {}

