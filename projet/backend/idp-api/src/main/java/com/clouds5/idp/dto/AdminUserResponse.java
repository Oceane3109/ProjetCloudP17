package com.clouds5.idp.dto;

import java.time.Instant;
import java.util.UUID;

public record AdminUserResponse(
    UUID id, String email, boolean locked, Instant lockedAt, int failedLoginAttempts) {}

