package com.clouds5.idp.service;

import com.clouds5.idp.exception.ApiException;
import com.clouds5.idp.model.Role;
import com.clouds5.idp.model.User;
import com.clouds5.idp.repo.UserRepository;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserAdminService {
  private final UserRepository users;
  private final PasswordEncoder encoder;

  @Transactional
  public User createUser(String email, String password) {
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
    return users.save(u);
  }

  @Transactional(readOnly = true)
  public List<User> listLocked() {
    return users.findByLockedTrue();
  }

  @Transactional
  public void unlockById(UUID userId) {
    var user =
        users.findById(userId).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));
    user.setLocked(false);
    user.setLockedAt(null);
    user.setFailedLoginAttempts(0);
    users.save(user);
  }

  @Transactional
  public void unlockByEmail(String email) {
    var normalized = email.trim().toLowerCase(Locale.ROOT);
    var user =
        users
            .findByEmailIgnoreCase(normalized)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));
    user.setLocked(false);
    user.setLockedAt(null);
    user.setFailedLoginAttempts(0);
    users.save(user);
  }

  /**
   * Crée (ou remet en état) un utilisateur "locked@local" bloqué, pour permettre un test simple
   * du bouton "Débloquer" sans avoir à saisir un email ni faire 3 essais.
   */
  @Transactional
  public User createOrResetDemoLockedUser() {
    String email = "locked@local";
    User u = users.findByEmailIgnoreCase(email).orElseGet(User::new);
    u.setEmail(email);
    // mot de passe demo (peu importe ici), utile si tu veux tester le lock par login
    u.setPasswordHash(encoder.encode("demo"));
    if (u.getRole() == null) u.setRole(com.clouds5.idp.model.Role.UTILISATEUR);
    u.setFailedLoginAttempts(3);
    u.setLocked(true);
    u.setLockedAt(java.time.Instant.now());
    return users.save(u);
  }
}

