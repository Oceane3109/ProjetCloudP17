package com.clouds5.idp;

import com.clouds5.idp.config.AppAuthProperties;
import com.clouds5.idp.config.AppCorsProperties;
import com.clouds5.idp.config.AppFirebaseProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties({AppAuthProperties.class, AppCorsProperties.class, AppFirebaseProperties.class})
public class IdpApiApplication {
  public static void main(String[] args) {
    SpringApplication.run(IdpApiApplication.class, args);
  }
}

