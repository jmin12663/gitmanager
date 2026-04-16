package com.capstone.gitmanager.board.dto;

import com.capstone.gitmanager.board.entity.Card;
import com.capstone.gitmanager.board.entity.CardStatus;

import java.time.LocalDate;
import java.util.List;

public record CardSummaryResponse(
        Long id,
        String title,
        CardStatus status,
        LocalDate dueDate,
        List<AssigneeResponse> assignees
) {
    public static CardSummaryResponse from(Card card) {
        return new CardSummaryResponse(
                card.getId(),
                card.getTitle(),
                card.getStatus(),
                card.getDueDate(),
                card.getAssignees().stream().map(AssigneeResponse::from).toList()
        );
    }
}