package com.clouds5.idp.bootstrap;

import com.clouds5.idp.model.Role;
import com.clouds5.idp.model.User;
import com.clouds5.idp.repo.UserRepository;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class BootstrapManagerRunner implements CommandLineRunner {
  private final UserRepository users;
  private final PasswordEncoder encoder;

  @Value("${APP_BOOTSTRAP_MANAGER_EMAIL:}")
  private String managerEmail;

  @Value("${APP_BOOTSTRAP_MANAGER_PASSWORD:}")
  private String managerPassword;

  @Override
  public void run(String... args) {
    if (managerEmail == null || managerEmail.isBlank()) return;
    if (managerPassword == null || managerPassword.isBlank()) return;

    var email = managerEmail.trim().toLowerCase(Locale.ROOT);

    users
        .findByEmailIgnoreCase(email)
        .ifPresentOrElse(
            u -> {
              // si le compte existe déjà, on ne touche pas
            },
            () -> {
              var u = new User();
              u.setEmail(email);
              u.setPasswordHash(encoder.encode(managerPassword));
              u.setRole(Role.MANAGER);
              u.setFailedLoginAttempts(0);
              u.setLocked(false);
              u.setLockedAt(null);
              users.save(u);
            });
  }
}

