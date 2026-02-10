package com.clouds5.idp.controller;

import com.clouds5.idp.dto.AuthResponse;
import com.clouds5.idp.dto.LoginRequest;
import com.clouds5.idp.dto.MeResponse;
import com.clouds5.idp.dto.RegisterRequest;
import com.clouds5.idp.security.UserPrincipal;
import com.clouds5.idp.service.AuthService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
  private final AuthService authService;

  @PostMapping("/register")
  public ResponseEntity<Void> register(@Valid @RequestBody RegisterRequest req) {
    authService.register(req.email(), req.password());
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/login")
  public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req) {
    return ResponseEntity.ok(authService.login(req.email(), req.password()));
  }

  @PostMapping("/logout")
  @SecurityRequirement(name = "bearerAuth")
  public ResponseEntity<Void> logout() {
    var auth = SecurityContextHolder.getContext().getAuthentication();
    Object details = auth != null ? auth.getDetails() : null;
    var jti = details instanceof String s ? s : null;
    authService.logout(jti);
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/me")
  @SecurityRequirement(name = "bearerAuth")
  public ResponseEntity<MeResponse> me(@AuthenticationPrincipal UserPrincipal principal) {
    return ResponseEntity.ok(new MeResponse(principal.id(), principal.email(), principal.role().name()));
  }
}

