package com.capstone.gitmanager.auth.controller;

import com.capstone.gitmanager.auth.dto.EmailVerifyRequest;
import com.capstone.gitmanager.auth.dto.LoginRequest;
import com.capstone.gitmanager.auth.dto.LoginResponse;
import com.capstone.gitmanager.auth.dto.RegisterRequest;
import com.capstone.gitmanager.auth.dto.TokenRefreshResponse;
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

    @PostMapping("/register")
    public ApiResponse<Void> register(@Valid @RequestBody RegisterRequest request) {
        authService.register(request);
        return ApiResponse.ok();
    }

    @PostMapping("/verify-email")
    public ApiResponse<Void> verifyEmail(@Valid @RequestBody EmailVerifyRequest request) {
        authService.verifyEmail(request);
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
}