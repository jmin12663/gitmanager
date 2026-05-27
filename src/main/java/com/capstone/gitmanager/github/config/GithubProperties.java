package com.capstone.gitmanager.github.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "github")
@Getter
@Setter
public class GithubProperties {
    private String clientId;
    private String clientSecret;
    private String redirectUri;
    private String webhookBaseUrl;
    private String frontendUrl;
}