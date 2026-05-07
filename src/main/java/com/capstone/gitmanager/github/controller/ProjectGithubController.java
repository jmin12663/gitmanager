package com.capstone.gitmanager.github.controller;

import com.capstone.gitmanager.common.dto.ApiResponse;
import com.capstone.gitmanager.github.dto.ProjectGithubResponse;
import com.capstone.gitmanager.github.service.ProjectGithubService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/projects/{projectId}/github")
@RequiredArgsConstructor
public class ProjectGithubController {

    private final ProjectGithubService projectGithubService;

    @GetMapping
    public ApiResponse<ProjectGithubResponse> getGithubConfig(
            @PathVariable Long projectId,
            @AuthenticationPrincipal Long userId
    ) {
        return ApiResponse.ok(projectGithubService.getGithubConfig(projectId, userId));
    }

    @PostMapping("/sync")
    public ApiResponse<Void> syncGithub(
            @PathVariable Long projectId,
            @AuthenticationPrincipal Long userId
    ) {
        projectGithubService.syncGithub(projectId, userId);
        return ApiResponse.ok();
    }
}