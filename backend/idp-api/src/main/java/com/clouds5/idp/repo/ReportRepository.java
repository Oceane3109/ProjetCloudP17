package com.clouds5.idp.repo;

import com.clouds5.idp.model.Report;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReportRepository extends JpaRepository<Report, UUID> {
  List<Report> findAllByUser_Id(UUID userId);
}

