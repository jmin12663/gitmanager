package com.capstone.gitmanager.board.controller;

import com.capstone.gitmanager.board.dto.BranchResponse;
import com.capstone.gitmanager.board.dto.CardBranchRequest;
import com.capstone.gitmanager.board.service.CardBranchService;
import com.capstone.gitmanager.common.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/projects/{projectId}/cards/{cardId}/branches")
@RequiredArgsConstructor
public class CardBranchController {

    private final CardBranchService cardBranchService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<BranchResponse> addBranch(
            @PathVariable Long projectId,
            @PathVariable Long cardId,
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody CardBranchRequest request
    ) {
        return ApiResponse.ok(cardBranchService.addBranch(projectId, cardId, userId, request));
    }

    @DeleteMapping("/{branchName}")
    public ApiResponse<Void> removeBranch(
            @PathVariable Long projectId,
            @PathVariable Long cardId,
            @PathVariable String branchName,
            @AuthenticationPrincipal Long userId
    ) {
        cardBranchService.removeBranch(projectId, cardId, userId, branchName);
        return ApiResponse.ok();
    }
}