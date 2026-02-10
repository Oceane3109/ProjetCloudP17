package com.clouds5.idp.controller;

import com.clouds5.idp.dto.AdminUserResponse;
import com.clouds5.idp.dto.AdminCreateUserRequest;
import com.clouds5.idp.dto.UnlockByEmailRequest;
import com.clouds5.idp.model.User;
import com.clouds5.idp.service.UserAdminService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class AdminUsersController {
  private final UserAdminService userAdminService;

  @PostMapping
  @PreAuthorize("hasRole('MANAGER')")
  public ResponseEntity<AdminUserResponse> createUser(@Valid @RequestBody AdminCreateUserRequest req) {
    var u = userAdminService.createUser(req.email(), req.password());
    return ResponseEntity.ok(toDto(u));
  }

  @GetMapping("/locked")
  @PreAuthorize("hasRole('MANAGER')")
  public ResponseEntity<List<AdminUserResponse>> listLocked() {
    return ResponseEntity.ok(userAdminService.listLocked().stream().map(AdminUsersController::toDto).toList());
  }

  @PostMapping("/{id}/unlock")
  @PreAuthorize("hasRole('MANAGER')")
  public ResponseEntity<Void> unlock(@PathVariable("id") UUID userId) {
    userAdminService.unlockById(userId);
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/unlock-by-email")
  @PreAuthorize("hasRole('MANAGER')")
  public ResponseEntity<Void> unlockByEmail(@Valid @RequestBody UnlockByEmailRequest req) {
    userAdminService.unlockByEmail(req.email());
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/demo-lock")
  @PreAuthorize("hasRole('MANAGER')")
  public ResponseEntity<AdminUserResponse> createDemoLockedUser() {
    var u = userAdminService.createOrResetDemoLockedUser();
    return ResponseEntity.ok(toDto(u));
  }

  private static AdminUserResponse toDto(User u) {
    return new AdminUserResponse(
        u.getId(), u.getEmail(), u.isLocked(), u.getLockedAt(), u.getFailedLoginAttempts());
  }
}

