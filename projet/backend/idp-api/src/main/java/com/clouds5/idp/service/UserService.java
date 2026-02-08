package com.clouds5.idp.service;

import com.clouds5.idp.dto.UpdateMeRequest;
import com.clouds5.idp.exception.ApiException;
import com.clouds5.idp.model.User;
import com.clouds5.idp.repo.UserRepository;
import java.util.Locale;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {
  private final UserRepository users;
  private final PasswordEncoder encoder;

  @Transactional
  public User updateMe(UUID userId, UpdateMeRequest req) {
    var u = users.findById(userId).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

    if (req.email() != null && !req.email().isBlank()) {
      var email = req.email().trim().toLowerCase(Locale.ROOT);
      if (!email.equalsIgnoreCase(u.getEmail()) && users.existsByEmailIgnoreCase(email)) {
        throw new ApiException(HttpStatus.CONFLICT, "Email déjà utilisé");
      }
      u.setEmail(email);
    }

    if (req.password() != null && !req.password().isBlank()) {
      u.setPasswordHash(encoder.encode(req.password()));
    }

    return users.save(u);
  }
}

