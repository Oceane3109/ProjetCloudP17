package com.clouds5.idp.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.auth")
public record AppAuthProperties(
    String jwtSecret, long jwtTtlMinutes, long sessionTtlMinutes, int maxFailedAttempts) {}

