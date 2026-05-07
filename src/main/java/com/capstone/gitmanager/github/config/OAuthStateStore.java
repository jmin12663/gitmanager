package com.capstone.gitmanager.github.config;

import com.capstone.gitmanager.common.config.JwtProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class OAuthStateStore {

    private static final long STATE_EXPIRATION_MILLIS = 10 * 60 * 1000L;
    private static final String STATE_TYPE = "github_oauth_state";

    private final SecretKey signingKey;
    private final Map<String, Long> consumedStates = new ConcurrentHashMap<>();

    public OAuthStateStore(JwtProperties jwtProperties) {
        this.signingKey = Keys.hmacShaKeyFor(jwtProperties.secret().getBytes(StandardCharsets.UTF_8));
    }

    public record OAuthState(Long projectId, Long userId, String repoUrl) {}

    public String save(Long projectId, Long userId, String repoUrl) {
        cleanupExpiredConsumedStates(System.currentTimeMillis());
        Date now = new Date();
        return Jwts.builder()
                .subject(String.valueOf(projectId))
                .claim("type", STATE_TYPE)
                .claim("projectId", projectId)
                .claim("userId", userId)
                .claim("repoUrl", repoUrl)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + STATE_EXPIRATION_MILLIS))
                .signWith(signingKey)
                .compact();
    }

    public OAuthState getAndRemove(String state) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(signingKey)
                    .build()
                    .parseSignedClaims(state)
                    .getPayload();

            if (!STATE_TYPE.equals(claims.get("type", String.class))) {
                return null;
            }

            long now = System.currentTimeMillis();
            cleanupExpiredConsumedStates(now);

            Date expiration = claims.getExpiration();
            long expiresAt = expiration != null ? expiration.getTime() : now + STATE_EXPIRATION_MILLIS;
            if (consumedStates.putIfAbsent(state, expiresAt) != null) {
                return null;
            }

            Long projectId = ((Number) claims.get("projectId")).longValue();
            Long userId = ((Number) claims.get("userId")).longValue();
            String repoUrl = claims.get("repoUrl", String.class);

            if (projectId == null || userId == null || repoUrl == null || repoUrl.isBlank()) {
                return null;
            }

            return new OAuthState(projectId, userId, repoUrl);
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }

    private void cleanupExpiredConsumedStates(long now) {
        consumedStates.entrySet().removeIf(entry -> entry.getValue() <= now);
    }
}
