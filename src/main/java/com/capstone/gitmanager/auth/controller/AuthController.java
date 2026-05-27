package com.capstone.gitmanager.auth.controller;

import com.capstone.gitmanager.auth.dto.ChangePasswordRequest;
import com.capstone.gitmanager.auth.dto.EmailVerifyRequest;
import com.capstone.gitmanager.auth.dto.LoginRequest;
import com.capstone.gitmanager.auth.dto.RegisterRequest;
import com.capstone.gitmanager.auth.dto.SendEmailCodeRequest;
import com.capstone.gitmanager.auth.dto.TokenRefreshResponse;
import com.capstone.gitmanager.auth.dto.UpdateLoginIdRequest;
import com.capstone.gitmanager.auth.dto.UpdateProfileRequest;
import com.capstone.gitmanager.auth.dto.UserResponse;
import com.capstone.gitmanager.auth.service.AuthService;
import com.capstone.gitmanager.common.dto.ApiResponse;
import com.capstone.gitmanager.common.exception.CustomException;
import com.capstone.gitmanager.common.exception.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/send-email-code")
    public ApiResponse<Void> sendEmailCode(@Valid @RequestBody SendEmailCodeRequest request) {
        authService.sendEmailCode(request);
        return ApiResponse.ok();
    }

    @PostMapping("/verify-email-code")
    public ApiResponse<Void> verifyEmailCode(@Valid @RequestBody EmailVerifyRequest request) {
        authService.verifyEmailCode(request);
        return ApiResponse.ok();
    }

    @PostMapping("/register")
    public ApiResponse<Void> register(@Valid @RequestBody RegisterRequest request) {
        authService.register(request);
        return ApiResponse.ok();
    }

    @PostMapping("/login")
    public ApiResponse<?> login(@Valid @RequestBody LoginRequest request,
                                HttpServletResponse response) {
        try {
            return ApiResponse.ok(authService.login(request, response));
        } catch (CustomException e) {
            if (e.getErrorCode() == ErrorCode.EMAIL_NOT_VERIFIED) {
                String email = authService.findEmailByIdentifier(request.identifier());
                return ApiResponse.fail(ErrorCode.EMAIL_NOT_VERIFIED, Map.of("email", email));
            }
            throw e;
        }
    }

    @PostMapping("/refresh")
    public ApiResponse<TokenRefreshResponse> refresh(HttpServletRequest request) {
        return ApiResponse.ok(authService.refresh(request));
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(HttpServletRequest request, HttpServletResponse response) {
        authService.logout(request, response);
        return ApiResponse.ok();
    }

    @GetMapping("/me")
    public ApiResponse<UserResponse> getMe(@AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(authService.getMe(userId));
    }

    @PatchMapping("/me")
    public ApiResponse<UserResponse> updateProfile(@AuthenticationPrincipal Long userId,
                                                   @Valid @RequestBody UpdateProfileRequest request) {
        return ApiResponse.ok(authService.updateProfile(userId, request));
    }

    @GetMapping("/check-login-id")
    public ApiResponse<Void> checkLoginId(@RequestParam String loginId) {
        authService.checkLoginId(loginId);
        return ApiResponse.ok();
    }

    @PatchMapping("/login-id")
    public ApiResponse<UserResponse> updateLoginId(@AuthenticationPrincipal Long userId,
                                                   @Valid @RequestBody UpdateLoginIdRequest request) {
        return ApiResponse.ok(authService.updateLoginId(userId, request));
    }

    @PatchMapping("/password")
    public ApiResponse<Void> changePassword(@AuthenticationPrincipal Long userId,
                                            @Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(userId, request);
        return ApiResponse.ok();
    }
}