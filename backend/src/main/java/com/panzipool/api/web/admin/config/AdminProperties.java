package com.panzipool.api.web.admin.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "admin")
public class AdminProperties {

    private int sessionTimeoutMinutes = 120;

    private boolean secureCookie = false;
}
