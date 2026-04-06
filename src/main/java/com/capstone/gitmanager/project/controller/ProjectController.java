package com.capstone.gitmanager.project.controller;

import com.capstone.gitmanager.common.dto.ApiResponse;
import com.capstone.gitmanager.project.dto.*;
import com.capstone.gitmanager.project.service.ProjectService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ProjectResponse> createProject(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody ProjectCreateRequest request) {
        return ApiResponse.ok(projectService.createProject(userId, request));
    }

    @GetMapping
    public ApiResponse<List<ProjectResponse>> getMyProjects(@AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(projectService.getMyProjects(userId));
    }

    @GetMapping("/{projectId}")
    public ApiResponse<ProjectResponse> getProject(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long projectId) {
        return ApiResponse.ok(projectService.getProject(userId, projectId));
    }

    @PutMapping("/{projectId}")
    public ApiResponse<ProjectResponse> updateProject(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long projectId,
            @Valid @RequestBody ProjectUpdateRequest request) {
        return ApiResponse.ok(projectService.updateProject(userId, projectId, request));
    }

    @DeleteMapping("/{projectId}")
    public ApiResponse<Void> deleteProject(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long projectId) {
        projectService.deleteProject(userId, projectId);
        return ApiResponse.ok();
    }

    @GetMapping("/{projectId}/invite-code")
    public ApiResponse<InviteCodeResponse> getInviteCode(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long projectId) {
        return ApiResponse.ok(projectService.getInviteCode(userId, projectId));
    }

    @PostMapping("/{projectId}/invite-code/regenerate")
    public ApiResponse<InviteCodeResponse> regenerateInviteCode(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long projectId) {
        return ApiResponse.ok(projectService.regenerateInviteCode(userId, projectId));
    }

    @PostMapping("/join")
    public ApiResponse<ProjectResponse> joinProject(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody JoinProjectRequest request) {
        return ApiResponse.ok(projectService.joinProject(userId, request));
    }

    @GetMapping("/{projectId}/members")
    public ApiResponse<List<ProjectMemberResponse>> getMembers(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long projectId) {
        return ApiResponse.ok(projectService.getMembers(userId, projectId));
    }

    @DeleteMapping("/{projectId}/members/{targetUserId}")
    public ApiResponse<Void> kickMember(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long projectId,
            @PathVariable Long targetUserId) {
        projectService.kickMember(userId, projectId, targetUserId);
        return ApiResponse.ok();
    }

    @PostMapping("/{projectId}/leave")
    public ApiResponse<Void> leaveProject(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long projectId,
            @RequestBody(required = false) LeaveProjectRequest request) {
        projectService.leaveProject(userId, projectId, request);
        return ApiResponse.ok();
    }
}