package com.clouds5.idp.dto;

import java.util.UUID;

public record MeResponse(UUID id, String email, String role) {}

