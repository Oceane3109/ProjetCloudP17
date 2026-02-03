package com.clouds5.idp.security;

import com.clouds5.idp.repo.SessionRepository;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {
  private final JwtService jwtService;
  private final UserDetailsServiceImpl userDetailsService;
  private final SessionRepository sessions;

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {

    var authHeader = request.getHeader("Authorization");
    if (authHeader == null || !authHeader.startsWith("Bearer ")) {
      filterChain.doFilter(request, response);
      return;
    }

    var token = authHeader.substring("Bearer ".length()).trim();
    try {
      Claims claims = jwtService.parseAndValidate(token);
      String userId = claims.getSubject();
      String jti = claims.getId();
      Instant exp = claims.getExpiration().toInstant();

      if (exp.isBefore(Instant.now())) {
        filterChain.doFilter(request, response);
        return;
      }

      var sessionOpt = sessions.findByJtiAndRevokedFalse(jti);
      if (sessionOpt.isEmpty() || sessionOpt.get().getExpiresAt().isBefore(Instant.now())) {
        filterChain.doFilter(request, response);
        return;
      }

      if (SecurityContextHolder.getContext().getAuthentication() == null) {
        UserDetails userDetails = userDetailsService.loadUserByUsername(userId);
        var auth =
            new UsernamePasswordAuthenticationToken(
                userDetails, null, userDetails.getAuthorities());
        // on stocke le jti dans "details" pour pouvoir faire logout côté API
        auth.setDetails(jti);
        SecurityContextHolder.getContext().setAuthentication(auth);
      }
    } catch (Exception ignored) {
      // Token invalide => on laisse passer sans authentification (Spring renverra 401 si route protégée)
    }

    filterChain.doFilter(request, response);
  }
}

