package com.capstone.gitmanager.auth.controller;

import com.capstone.gitmanager.auth.service.AuthService;
import com.capstone.gitmanager.common.dto.ApiResponse;
import com.capstone.gitmanager.github.config.GithubProperties;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth/github")
@RequiredArgsConstructor
public class GithubLoginController {

    private final AuthService authService;
    private final GithubProperties githubProperties;

    @GetMapping("/login")
    public ApiResponse<String> getLoginUrl() {
        return ApiResponse.ok(authService.generateGithubLoginUrl());
    }

    // GitHub이 직접 호출하는 콜백 — JWT 인증 없음 (SecurityConfig에서 permitAll)
    @GetMapping("/callback")
    public ResponseEntity<Void> callback(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String error,
            HttpServletResponse response
    ) {
        if (error != null || code == null || state == null) {
            String redirectUrl = githubProperties.getFrontendUrl() + "/login?error=denied";
            return ResponseEntity.status(HttpStatus.FOUND)
                    .header("Location", redirectUrl)
                    .build();
        }

        String redirectUrl = authService.handleGithubCallback(code, state, response);
        return ResponseEntity.status(HttpStatus.FOUND)
                .header("Location", redirectUrl)
                .build();
    }
}