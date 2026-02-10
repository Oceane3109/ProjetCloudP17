package com.clouds5.idp.bootstrap;

import com.clouds5.idp.config.AppAuthProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class SecurityStartupValidator implements CommandLineRunner {
  private static final Logger log = LoggerFactory.getLogger(SecurityStartupValidator.class);

  private final AppAuthProperties authProps;

  public SecurityStartupValidator(AppAuthProperties authProps) {
    this.authProps = authProps;
  }

  @Override
  public void run(String... args) {
    String secret = authProps.jwtSecret();
    if (secret == null || secret.isBlank()) {
      log.warn("JWT secret (app.auth.jwtSecret) is empty — set APP_JWT_SECRET environment variable.");
      return;
    }
    String defaultDev = "secure-me-during-exam-please-change!!";
    if (defaultDev.equals(secret)) {
      log.warn("Using default JWT secret from application.yml. PLEASE set APP_JWT_SECRET for production.");
    }
    if (secret.length() < 32) {
      log.warn("JWT secret length is less than 32 characters — consider a stronger secret.");
    }
  }
}
