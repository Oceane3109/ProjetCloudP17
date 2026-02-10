package com.clouds5.idp.security;

import com.clouds5.idp.config.AppAuthProperties;
import com.clouds5.idp.model.Role;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.time.Instant;
import java.util.Date;
import java.util.Map;
import java.util.UUID;
import java.nio.charset.StandardCharsets;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
  private final SecretKey key;

  public JwtService(AppAuthProperties props) {
    this.key = Keys.hmacShaKeyFor(props.jwtSecret().getBytes(StandardCharsets.UTF_8));
  }

  public String issueToken(UUID userId, Role role, String jti, Instant expiresAt) {
    return Jwts.builder()
        .subject(userId.toString())
        .id(jti)
        .claims(Map.of("role", role.name()))
        .issuedAt(Date.from(Instant.now()))
        .expiration(Date.from(expiresAt))
        .signWith(key)
        .compact();
  }

  public Claims parseAndValidate(String jwt) {
    return Jwts.parser().verifyWith(key).build().parseSignedClaims(jwt).getPayload();
  }
}

