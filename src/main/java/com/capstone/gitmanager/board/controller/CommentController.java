package com.capstone.gitmanager.board.controller;

import com.capstone.gitmanager.board.dto.CommentCreateRequest;
import com.capstone.gitmanager.board.dto.CommentResponse;
import com.capstone.gitmanager.board.service.CommentService;
import com.capstone.gitmanager.common.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects/{projectId}/cards/{cardId}/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    @GetMapping
    public ApiResponse<List<CommentResponse>> getComments(
            @PathVariable Long projectId,
            @PathVariable Long cardId,
            @AuthenticationPrincipal Long userId
    ) {
        return ApiResponse.ok(commentService.getComments(projectId, cardId, userId));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<CommentResponse> createComment(
            @PathVariable Long projectId,
            @PathVariable Long cardId,
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody CommentCreateRequest request
    ) {
        return ApiResponse.ok(commentService.createComment(projectId, cardId, userId, request));
    }

    @DeleteMapping("/{commentId}")
    public ApiResponse<Void> deleteComment(
            @PathVariable Long projectId,
            @PathVariable Long cardId,
            @PathVariable Long commentId,
            @AuthenticationPrincipal Long userId
    ) {
        commentService.deleteComment(projectId, cardId, commentId, userId);
        return ApiResponse.ok();
    }
}