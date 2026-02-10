package com.clouds5.idp.security;

import com.clouds5.idp.repo.UserRepository;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {
  private final UserRepository users;

  @Override
  public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
    UUID userId;
    try {
      userId = UUID.fromString(username);
    } catch (Exception e) {
      throw new UsernameNotFoundException("Invalid user id");
    }

    var user = users.findById(userId).orElseThrow(() -> new UsernameNotFoundException("User not found"));
    return UserPrincipal.from(user);
  }
}

