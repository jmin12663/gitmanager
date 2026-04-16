package com.capstone.gitmanager.board.controller;

import com.capstone.gitmanager.board.dto.*;
import com.capstone.gitmanager.board.service.CardService;
import com.capstone.gitmanager.common.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/projects/{projectId}")
@RequiredArgsConstructor
public class CardController {

    private final CardService cardService;

    @GetMapping("/board")
    public ApiResponse<BoardResponse> getBoard(
            @PathVariable Long projectId,
            @AuthenticationPrincipal Long userId
    ) {
        return ApiResponse.ok(cardService.getBoard(projectId, userId));
    }

    @PostMapping("/cards")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<CardResponse> createCard(
            @PathVariable Long projectId,
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody CardCreateRequest request
    ) {
        return ApiResponse.ok(cardService.createCard(projectId, userId, request));
    }

    @GetMapping("/cards/{cardId}")
    public ApiResponse<CardResponse> getCard(
            @PathVariable Long projectId,
            @PathVariable Long cardId,
            @AuthenticationPrincipal Long userId
    ) {
        return ApiResponse.ok(cardService.getCard(projectId, cardId, userId));
    }

    @PatchMapping("/cards/{cardId}")
    public ApiResponse<CardResponse> updateCard(
            @PathVariable Long projectId,
            @PathVariable Long cardId,
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody CardUpdateRequest request
    ) {
        return ApiResponse.ok(cardService.updateCard(projectId, userId, cardId, request));
    }

    @PatchMapping("/cards/{cardId}/status")
    public ApiResponse<Void> updateCardStatus(
            @PathVariable Long projectId,
            @PathVariable Long cardId,
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody CardStatusUpdateRequest request
    ) {
        cardService.updateCardStatus(projectId, userId, cardId, request);
        return ApiResponse.ok();
    }

    @DeleteMapping("/cards/{cardId}")
    public ApiResponse<Void> deleteCard(
            @PathVariable Long projectId,
            @PathVariable Long cardId,
            @AuthenticationPrincipal Long userId
    ) {
        cardService.deleteCard(projectId, userId, cardId);
        return ApiResponse.ok();
    }
}