package com.capstone.gitmanager.github.controller;

import com.capstone.gitmanager.common.dto.ApiResponse;
import com.capstone.gitmanager.github.dto.CreatePrCommentRequest;
import com.capstone.gitmanager.github.dto.PullFileResponse;
import com.capstone.gitmanager.github.dto.PullRequestResponse;
import com.capstone.gitmanager.github.service.PullRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class PullRequestController {

    private final PullRequestService pullRequestService;

    @GetMapping("/api/projects/{projectId}/cards/{cardId}/pulls")
    public ApiResponse<List<PullRequestResponse>> getCardPulls(
            @PathVariable Long projectId,
            @PathVariable Long cardId,
            @AuthenticationPrincipal Long userId
    ) {
        return ApiResponse.ok(pullRequestService.getCardPulls(projectId, cardId, userId));
    }

    @GetMapping("/api/projects/{projectId}/pulls")
    public ApiResponse<List<PullRequestResponse>> getProjectPulls(
            @PathVariable Long projectId,
            @RequestParam(defaultValue = "open") String state,
            @AuthenticationPrincipal Long userId
    ) {
        return ApiResponse.ok(pullRequestService.getProjectPulls(projectId, userId, state));
    }

    @GetMapping("/api/projects/{projectId}/pulls/{prNumber}/files")
    public ApiResponse<List<PullFileResponse>> getPullFiles(
            @PathVariable Long projectId,
            @PathVariable int prNumber,
            @AuthenticationPrincipal Long userId
    ) {
        return ApiResponse.ok(pullRequestService.getPullFiles(projectId, prNumber, userId));
    }

    @PostMapping("/api/projects/{projectId}/pulls/{prNumber}/comments")
    public ApiResponse<Void> createPrComment(
            @PathVariable Long projectId,
            @PathVariable int prNumber,
            @RequestBody @Valid CreatePrCommentRequest request,
            @AuthenticationPrincipal Long userId
    ) {
        pullRequestService.createPrComment(projectId, prNumber, request, userId);
        return ApiResponse.ok();
    }
}
