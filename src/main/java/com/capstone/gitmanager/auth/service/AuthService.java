package com.capstone.gitmanager.auth.service;

import com.capstone.gitmanager.auth.dto.EmailVerifyRequest;
import com.capstone.gitmanager.auth.dto.LoginRequest;
import com.capstone.gitmanager.auth.dto.LoginResponse;
import com.capstone.gitmanager.auth.dto.RegisterRequest;
import com.capstone.gitmanager.auth.dto.TokenRefreshResponse;
import com.capstone.gitmanager.auth.dto.UserResponse;
import com.capstone.gitmanager.auth.entity.EmailVerificationToken;
import com.capstone.gitmanager.auth.entity.RefreshToken;
import com.capstone.gitmanager.auth.entity.User;
import com.capstone.gitmanager.auth.repository.EmailVerificationTokenRepository;
import com.capstone.gitmanager.auth.repository.RefreshTokenRepository;
import com.capstone.gitmanager.auth.repository.UserRepository;
import com.capstone.gitmanager.common.config.JwtProperties;
import com.capstone.gitmanager.common.exception.CustomException;
import com.capstone.gitmanager.common.exception.ErrorCode;
import com.capstone.gitmanager.common.util.JwtUtil;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.WebUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthService {

    private static final int EMAIL_VERIFICATION_EXPIRE_MINUTES = 30;

    @Value("${cookie.secure:false}")
    private boolean cookieSecure;

    private final UserRepository userRepository;
    private final EmailVerificationTokenRepository emailTokenRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final JwtProperties jwtProperties;
    private final EmailService emailService;

    @Transactional
    public void register(RegisterRequest request) {
        if (userRepository.existsByLoginId(request.loginId())) {
            throw new CustomException(ErrorCode.LOGIN_ID_ALREADY_EXISTS);
        }
        if (userRepository.existsByEmail(request.email())) {
            throw new CustomException(ErrorCode.EMAIL_ALREADY_EXISTS);
        }

        User user = User.builder()
                .loginId(request.loginId())
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .name(request.name())
                .build();
        userRepository.save(user);

        String code = String.format("%06d", new SecureRandom().nextInt(1_000_000));
        EmailVerificationToken emailToken = EmailVerificationToken.builder()
                .user(user)
                .token(code)
                .expiresAt(LocalDateTime.now().plusMinutes(EMAIL_VERIFICATION_EXPIRE_MINUTES))
                .build();
        emailTokenRepository.save(emailToken);

        emailService.sendVerificationEmail(user.getEmail(), code);
    }

    @Transactional
    public void verifyEmail(EmailVerifyRequest request) {
        EmailVerificationToken emailToken = emailTokenRepository
                .findByUser_EmailAndToken(request.email(), request.code())
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_EMAIL_TOKEN));

        if (emailToken.isExpired()) {
            throw new CustomException(ErrorCode.EMAIL_TOKEN_EXPIRED);
        }

        emailToken.getUser().verifyEmail();
        emailTokenRepository.deleteByUser(emailToken.getUser());
    }

    @Transactional
    public LoginResponse login(LoginRequest request, HttpServletResponse response) {
        User user = resolveUser(request.identifier());

        if (!user.isEmailVerified()) {
            throw new CustomException(ErrorCode.EMAIL_NOT_VERIFIED);
        }

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new CustomException(ErrorCode.INVALID_PASSWORD);
        }

        String accessToken = jwtUtil.generateAccessToken(user.getId());
        String refreshToken = jwtUtil.generateRefreshToken(user.getId());

        refreshTokenRepository.deleteByUser(user);

        RefreshToken refreshTokenEntity = RefreshToken.builder()
                .user(user)
                .tokenHash(hash(refreshToken))
                .expiresAt(LocalDateTime.now().plusSeconds(jwtProperties.refreshExpiration() / 1000))
                .build();
        refreshTokenRepository.save(refreshTokenEntity);

        setRefreshTokenCookie(response, refreshToken);

        return new LoginResponse(user.getId(), user.getName(), user.getEmail(), accessToken);
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

    //로그인 시 이메일 혹은 아이디로
    public String findEmailByIdentifier(String identifier) {
        return resolveUser(identifier).getEmail();
    }

    private User resolveUser(String identifier) {
        if (identifier.contains("@")) {
            return userRepository.findByEmail(identifier)
                    .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
        }
        return userRepository.findByLoginId(identifier)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
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