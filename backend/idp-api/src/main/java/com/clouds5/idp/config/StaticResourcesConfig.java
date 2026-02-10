package com.clouds5.idp.config;

import java.nio.file.Path;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class StaticResourcesConfig implements WebMvcConfigurer {

  private final AppUploadProperties uploadProps;

  public StaticResourcesConfig(AppUploadProperties uploadProps) {
    this.uploadProps = uploadProps;
  }

  @Override
  public void addResourceHandlers(ResourceHandlerRegistry registry) {
    Path base = Path.of(uploadProps.getDir()).toAbsolutePath().normalize();
    String location = base.toUri().toString();
    if (!location.endsWith("/")) location = location + "/";

    registry.addResourceHandler("/uploads/**").addResourceLocations(location);
  }
}
