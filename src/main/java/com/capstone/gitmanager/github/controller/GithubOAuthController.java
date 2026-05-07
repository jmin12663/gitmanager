package com.capstone.gitmanager.github.controller;

import com.capstone.gitmanager.common.dto.ApiResponse;
import com.capstone.gitmanager.github.config.GithubProperties;
import com.capstone.gitmanager.github.service.ProjectGithubService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/github")
@RequiredArgsConstructor
public class GithubOAuthController {

    private final ProjectGithubService projectGithubService;
    private final GithubProperties githubProperties;

    // 프론트가 이 URL을 받아서 window.location.href로 이동
    @GetMapping("/oauth/redirect")
    public ApiResponse<String> getOAuthUrl(
            @RequestParam Long projectId,
            @RequestParam String repoUrl,
            @AuthenticationPrincipal Long userId
    ) {
        return ApiResponse.ok(projectGithubService.generateOAuthUrl(projectId, userId, repoUrl));
    }

    // GitHub가 직접 호출하는 콜백 — JWT 인증 없음 (SecurityConfig에서 permitAll)
    @GetMapping("/oauth/callback")
    public ResponseEntity<Void> callback(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String error
    ) {
        // 사용자가 GitHub에서 접근 거부한 경우
        if (error != null || code == null || state == null) {
            String redirectUrl = githubProperties.getFrontendUrl() + "?github=denied";
            return ResponseEntity.status(HttpStatus.FOUND).header("Location", redirectUrl).build();
        }

        Long projectId = projectGithubService.handleOAuthCallback(code, state);
        String redirectUrl = githubProperties.getFrontendUrl()
                + "/projects/" + projectId + "/settings?github=connected";
        return ResponseEntity.status(HttpStatus.FOUND)
                .header("Location", redirectUrl)
                .build();
    }
}