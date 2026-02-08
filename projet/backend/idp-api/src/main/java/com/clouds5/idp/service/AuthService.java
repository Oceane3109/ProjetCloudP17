package com.clouds5.idp.service;

import com.clouds5.idp.config.AppAuthProperties;
import com.clouds5.idp.dto.AuthResponse;
import com.clouds5.idp.exception.ApiException;
import com.clouds5.idp.model.Role;
import com.clouds5.idp.model.Session;
import com.clouds5.idp.model.User;
import com.clouds5.idp.repo.SessionRepository;
import com.clouds5.idp.repo.UserRepository;
import com.clouds5.idp.security.JwtService;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Locale;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {
  private final UserRepository users;
  private final SessionRepository sessions;
  private final PasswordEncoder encoder;
  private final JwtService jwtService;
  private final AppAuthProperties authProps;

  @Transactional
  public void register(String email, String password) {
    var normalized = email.trim().toLowerCase(Locale.ROOT);
    if (users.existsByEmailIgnoreCase(normalized)) {
      throw new ApiException(HttpStatus.CONFLICT, "Email déjà utilisé");
    }

    var u = new User();
    u.setEmail(normalized);
    u.setPasswordHash(encoder.encode(password));
    u.setRole(Role.UTILISATEUR);
    u.setFailedLoginAttempts(0);
    u.setLocked(false);
    u.setLockedAt(null);
    users.save(u);
  }

  @Transactional
  public AuthResponse login(String email, String password) {
    var normalized = email.trim().toLowerCase(Locale.ROOT);
    var user =
        users
            .findByEmailIgnoreCase(normalized)
            .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Identifiants invalides"));

    if (user.isLocked()) {
      throw new ApiException(HttpStatus.LOCKED, "Compte bloqué (contactez un manager)");
    }

    if (!encoder.matches(password, user.getPasswordHash())) {
      int next = user.getFailedLoginAttempts() + 1;
      user.setFailedLoginAttempts(next);
      if (next >= authProps.maxFailedAttempts()) {
        user.setLocked(true);
        user.setLockedAt(Instant.now());
      }
      users.save(user);
      throw new ApiException(HttpStatus.UNAUTHORIZED, "Identifiants invalides");
    }

    // succès
    user.setFailedLoginAttempts(0);
    user.setLocked(false);
    user.setLockedAt(null);
    users.save(user);

    var now = Instant.now();
    // La durée de vie du JWT peut être différente de la durée de vie de la session
    var sessionExpiresAt = now.plus(authProps.sessionTtlMinutes(), ChronoUnit.MINUTES);
    var jwtExpiresAt = now.plus(authProps.jwtTtlMinutes(), ChronoUnit.MINUTES);
    var jti = randomJti();

    var s = new Session();
    s.setUser(user);
    s.setJti(jti);
    s.setIssuedAt(now);
    s.setExpiresAt(sessionExpiresAt);
    s.setRevoked(false);
    sessions.save(s);

    var jwt = jwtService.issueToken(user.getId(), user.getRole(), jti, jwtExpiresAt);
    return new AuthResponse(jwt, jwtExpiresAt, user.getRole().name());
  }

  @Transactional
  public void logout(String jti) {
    if (jti == null || jti.isBlank()) return;
    sessions
        .findByJtiAndRevokedFalse(jti)
        .ifPresent(
            s -> {
              s.setRevoked(true);
              sessions.save(s);
            });
  }

  private static String randomJti() {
    return UUID.randomUUID().toString().replace("-", "");
  }
}

