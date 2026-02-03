package com.clouds5.idp.repo;

import com.clouds5.idp.model.Session;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SessionRepository extends JpaRepository<Session, UUID> {
  Optional<Session> findByJtiAndRevokedFalse(String jti);
}

