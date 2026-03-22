package com.capstone.gitmanager.common.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "jwt")
public record JwtProperties(
        long accessExpiration,
        long refreshExpiration
) {
}