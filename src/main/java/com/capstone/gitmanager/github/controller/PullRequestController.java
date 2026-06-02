package com.capstone.gitmanager.github.controller;

import com.capstone.gitmanager.common.dto.ApiResponse;
import com.capstone.gitmanager.github.dto.CreatePrCommentRequest;
import com.capstone.gitmanager.github.dto.CreatePrCommentReplyRequest;
import com.capstone.gitmanager.github.dto.CreatePrRequest;
import com.capstone.gitmanager.github.dto.MergePrRequest;
import com.capstone.gitmanager.github.dto.PrLineCommentResponse;
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

    @GetMapping("/api/projects/{projectId}/branches")
    public ApiResponse<List<String>> getRepoBranches(
            @PathVariable Long projectId,
            @AuthenticationPrincipal Long userId
    ) {
        return ApiResponse.ok(pullRequestService.getRepoBranches(projectId, userId));
    }

    @PostMapping("/api/projects/{projectId}/pulls")
    public ApiResponse<PullRequestResponse> createPr(
            @PathVariable Long projectId,
            @RequestBody @Valid CreatePrRequest request,
            @AuthenticationPrincipal Long userId
    ) {
        return ApiResponse.ok(pullRequestService.createPr(projectId, request, userId));
    }

    @PatchMapping("/api/projects/{projectId}/pulls/{prNumber}/close")
    public ApiResponse<Void> closePr(
            @PathVariable Long projectId,
            @PathVariable int prNumber,
            @AuthenticationPrincipal Long userId
    ) {
        pullRequestService.closePr(projectId, prNumber, userId);
        return ApiResponse.ok(null);
    }

    @PutMapping("/api/projects/{projectId}/pulls/{prNumber}/merge")
    public ApiResponse<Void> mergePr(
            @PathVariable Long projectId,
            @PathVariable int prNumber,
            @RequestBody @Valid MergePrRequest request,
            @AuthenticationPrincipal Long userId
    ) {
        pullRequestService.mergePr(projectId, prNumber, request, userId);
        return ApiResponse.ok(null);
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

    @GetMapping("/api/projects/{projectId}/pulls/{prNumber}/comments")
    public ApiResponse<List<PrLineCommentResponse>> getPrLineComments(
            @PathVariable Long projectId,
            @PathVariable int prNumber,
            @AuthenticationPrincipal Long userId
    ) {
        return ApiResponse.ok(pullRequestService.getPrLineComments(projectId, prNumber, userId));
    }

    @PostMapping("/api/projects/{projectId}/pulls/{prNumber}/comments")
    public ApiResponse<PrLineCommentResponse> createPrComment(
            @PathVariable Long projectId,
            @PathVariable int prNumber,
            @RequestBody @Valid CreatePrCommentRequest request,
            @AuthenticationPrincipal Long userId
    ) {
        return ApiResponse.ok(pullRequestService.createPrComment(projectId, prNumber, request, userId));
    }

    @PostMapping("/api/projects/{projectId}/pulls/{prNumber}/comments/{commentId}/replies")
    public ApiResponse<PrLineCommentResponse> createPrCommentReply(
            @PathVariable Long projectId,
            @PathVariable int prNumber,
            @PathVariable long commentId,
            @RequestBody @Valid CreatePrCommentReplyRequest request,
            @AuthenticationPrincipal Long userId
    ) {
        return ApiResponse.ok(pullRequestService.createPrCommentReply(projectId, prNumber, commentId, request, userId));
    }
}
