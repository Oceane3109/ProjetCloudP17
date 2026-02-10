package com.clouds5.idp.controller;

import com.clouds5.idp.dto.MeResponse;
import com.clouds5.idp.dto.UpdateMeRequest;
import com.clouds5.idp.security.UserPrincipal;
import com.clouds5.idp.service.UserService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class UserController {
  private final UserService userService;

  @PatchMapping("/me")
  public ResponseEntity<MeResponse> updateMe(
      @AuthenticationPrincipal UserPrincipal principal, @Valid @RequestBody UpdateMeRequest req) {
    var u = userService.updateMe(principal.id(), req);
    return ResponseEntity.ok(new MeResponse(u.getId(), u.getEmail(), u.getRole().name()));
  }
}

