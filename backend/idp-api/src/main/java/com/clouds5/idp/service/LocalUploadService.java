package com.clouds5.idp.service;

import com.clouds5.idp.config.AppUploadProperties;
import com.clouds5.idp.exception.ApiException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class LocalUploadService {

  private final AppUploadProperties uploadProps;

  public String saveReportPhoto(String reportId, MultipartFile file) {
    try {
      String safeName =
          file.getOriginalFilename() != null
              ? file.getOriginalFilename().replaceAll("\\s+", "_")
              : "photo";

      Path base = Path.of(uploadProps.getDir());
      Path dir = base.resolve("reports").resolve(reportId);
      Files.createDirectories(dir);

      String filename = Instant.now().toEpochMilli() + "_" + safeName;
      Path target = dir.resolve(filename);
      try (var in = file.getInputStream()) {
        Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
      }

      String rel = "reports/" + reportId + "/" + filename;
      return "/uploads/" + rel.replace('\\', '/');
    } catch (IOException e) {
      throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Erreur upload local");
    }
  }
}
