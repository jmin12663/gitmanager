package com.capstone.gitmanager.auth.service;

import com.capstone.gitmanager.auth.dto.TokenRefreshResponse;
import com.capstone.gitmanager.auth.dto.UpdateProfileRequest;
import com.capstone.gitmanager.auth.dto.UserResponse;
import com.capstone.gitmanager.auth.entity.RefreshToken;
import com.capstone.gitmanager.auth.entity.User;
import com.capstone.gitmanager.auth.repository.RefreshTokenRepository;
import com.capstone.gitmanager.auth.repository.UserRepository;
import com.capstone.gitmanager.common.config.JwtProperties;
import com.capstone.gitmanager.common.exception.CustomException;
import com.capstone.gitmanager.common.exception.ErrorCode;
import com.capstone.gitmanager.common.util.JwtUtil;
import com.capstone.gitmanager.github.config.GithubProperties;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jasypt.encryption.StringEncryptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.WebUtils;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthService {

    @Value("${cookie.secure:false}")
    private boolean cookieSecure;

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtUtil jwtUtil;
    private final JwtProperties jwtProperties;
    private final GithubProperties githubProperties;
    private final StringEncryptor jasyptStringEncryptor;

    private final RestClient restClient = RestClient.create();
    private final ConcurrentHashMap<String, Long> loginOAuthStates = new ConcurrentHashMap<>();
    private static final long LOGIN_STATE_TTL_MS = 10 * 60 * 1000L;

    public String generateGithubLoginUrl() {
        cleanupExpiredLoginStates();
        String state = UUID.randomUUID().toString();
        loginOAuthStates.put(state, System.currentTimeMillis() + LOGIN_STATE_TTL_MS);
        return "https://github.com/login/oauth/authorize" +
               "?client_id=" + githubProperties.getClientId() +
               "&redirect_uri=" + URLEncoder.encode(githubProperties.getLoginRedirectUri(), StandardCharsets.UTF_8) +
               "&scope=read:user,user:email,repo" +
               "&state=" + state;
    }

    @Transactional
    public String handleGithubCallback(String code, String state, HttpServletResponse response) {
        if (!consumeLoginState(state)) {
            log.warn("[GitHub Login] 유효하지 않은 state: {}", state);
            return githubProperties.getFrontendUrl() + "/login?error=state";
        }

        String githubToken;
        Map<String, Object> githubUser;
        try {
            githubToken = exchangeCodeForToken(code);
            githubUser = fetchGithubUser(githubToken);
        } catch (Exception e) {
            log.error("[GitHub Login] GitHub API 호출 실패: {}", e.getMessage());
            return githubProperties.getFrontendUrl() + "/login?error=github";
        }

        Long githubId = ((Number) githubUser.get("id")).longValue();
        String githubLogin = (String) githubUser.get("login");
        String name = githubUser.get("name") != null ? (String) githubUser.get("name") : githubLogin;
        String email = (String) githubUser.get("email");
        String avatarUrl = (String) githubUser.get("avatar_url");

        if (email == null || email.isBlank()) {
            email = githubLogin + "@github.com";
        }

        String encryptedToken = jasyptStringEncryptor.encrypt(githubToken);

        User user = userRepository.findByGithubId(githubId).orElse(null);
        if (user == null) {
            user = User.builder()
                    .githubId(githubId)
                    .githubLogin(githubLogin)
                    .githubTokenEncrypted(encryptedToken)
                    .email(email)
                    .name(name)
                    .avatarUrl(avatarUrl)
                    .build();
            userRepository.save(user);
            log.info("[GitHub Login] 신규 유저 생성: githubId={}, login={}", githubId, githubLogin);
        } else {
            user.updateGithubToken(encryptedToken);
            user.updateGithubLogin(githubLogin);
            user.updateAvatarUrl(avatarUrl);
            log.info("[GitHub Login] 기존 유저 로그인: githubId={}, login={}", githubId, githubLogin);
        }

        String appRefreshToken = jwtUtil.generateRefreshToken(user.getId());
        refreshTokenRepository.deleteByUser(user);
        refreshTokenRepository.save(RefreshToken.builder()
                .user(user)
                .tokenHash(hash(appRefreshToken))
                .expiresAt(LocalDateTime.now().plusSeconds(jwtProperties.refreshExpiration() / 1000))
                .build());

        setRefreshTokenCookie(response, appRefreshToken);

        return githubProperties.getFrontendUrl() + "/todo";
    }

    @Transactional
    public TokenRefreshResponse refresh(HttpServletRequest request) {
        Cookie cookie = WebUtils.getCookie(request, "refreshToken");
        if (cookie == null) {
            throw new CustomException(ErrorCode.REFRESH_TOKEN_NOT_FOUND);
        }

        String rawToken = cookie.getValue();
        jwtUtil.validate(rawToken);

        RefreshToken stored = refreshTokenRepository.findByTokenHash(hash(rawToken))
                .orElseThrow(() -> new CustomException(ErrorCode.REFRESH_TOKEN_NOT_FOUND));

        if (stored.isExpired()) {
            throw new CustomException(ErrorCode.TOKEN_EXPIRED);
        }

        String newAccessToken = jwtUtil.generateAccessToken(stored.getUser().getId());
        return new TokenRefreshResponse(newAccessToken);
    }

    @Transactional
    public void logout(HttpServletRequest request, HttpServletResponse response) {
        Cookie cookie = WebUtils.getCookie(request, "refreshToken");
        if (cookie != null) {
            refreshTokenRepository.findByTokenHash(hash(cookie.getValue()))
                    .ifPresent(refreshTokenRepository::delete);
        }
        clearRefreshTokenCookie(response);
    }

    public UserResponse getMe(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse updateProfile(Long userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
        user.updateName(request.name());
        return UserResponse.from(user);
    }

    private String exchangeCodeForToken(String code) {
        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("client_id", githubProperties.getClientId());
        body.add("client_secret", githubProperties.getClientSecret());
        body.add("code", code);
        body.add("redirect_uri", githubProperties.getLoginRedirectUri());

        Map<String, String> response = restClient.post()
                .uri("https://github.com/login/oauth/access_token")
                .header("Accept", "application/json")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(body)
                .retrieve()
                .body(new ParameterizedTypeReference<>() {});

        if (response == null || response.get("access_token") == null) {
            throw new CustomException(ErrorCode.GITHUB_OAUTH_FAILED);
        }
        return response.get("access_token");
    }

    private Map<String, Object> fetchGithubUser(String token) {
        Map<String, Object> user = restClient.get()
                .uri("https://api.github.com/user")
                .header("Authorization", "Bearer " + token)
                .header("Accept", "application/vnd.github+json")
                .retrieve()
                .body(new ParameterizedTypeReference<>() {});

        if (user == null || user.get("id") == null) {
            throw new CustomException(ErrorCode.GITHUB_OAUTH_FAILED);
        }
        return user;
    }

    private boolean consumeLoginState(String state) {
        if (state == null) return false;
        Long expiry = loginOAuthStates.remove(state);
        return expiry != null && expiry > System.currentTimeMillis();
    }

    private void cleanupExpiredLoginStates() {
        long now = System.currentTimeMillis();
        loginOAuthStates.entrySet().removeIf(e -> e.getValue() <= now);
    }

    private void setRefreshTokenCookie(HttpServletResponse response, String token) {
        Cookie cookie = new Cookie("refreshToken", token);
        cookie.setHttpOnly(true);
        cookie.setSecure(cookieSecure);
        cookie.setPath("/api/auth");
        cookie.setMaxAge((int) (jwtProperties.refreshExpiration() / 1000));
        response.addCookie(cookie);
    }

    private void clearRefreshTokenCookie(HttpServletResponse response) {
        Cookie cookie = new Cookie("refreshToken", "");
        cookie.setHttpOnly(true);
        cookie.setSecure(cookieSecure);
        cookie.setPath("/api/auth");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
    }

    private String hash(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(bytes);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException(e);
        }
    }
}