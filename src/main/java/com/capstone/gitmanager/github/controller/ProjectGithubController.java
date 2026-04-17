package com.capstone.gitmanager.github.controller;

import com.capstone.gitmanager.common.dto.ApiResponse;
import com.capstone.gitmanager.github.dto.ProjectGithubRequest;
import com.capstone.gitmanager.github.dto.ProjectGithubResponse;
import com.capstone.gitmanager.github.service.ProjectGithubService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
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

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ProjectGithubResponse> registerGithubConfig(
            @PathVariable Long projectId,
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody ProjectGithubRequest request
    ) {
        return ApiResponse.ok(projectGithubService.registerGithubConfig(projectId, userId, request));
    }

}