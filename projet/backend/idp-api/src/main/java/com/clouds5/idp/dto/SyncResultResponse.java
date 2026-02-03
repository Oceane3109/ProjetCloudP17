package com.clouds5.idp.dto;

public record SyncResultResponse(int processed, int created, int updated, int skipped) {}

