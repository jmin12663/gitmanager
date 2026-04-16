package com.capstone.gitmanager.board.dto;

import com.capstone.gitmanager.board.entity.Card;
import com.capstone.gitmanager.board.entity.CardStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record CardResponse(
        Long id,
        String title,
        CardStatus status,
        LocalDate dueDate,
        String memo,
        Long createdBy,
        LocalDateTime mergedAt,
        List<AssigneeResponse> assignees,
        List<BranchResponse> branches,
        List<CommitLogResponse> commitLogs
) {
    public static CardResponse from(Card card, List<CommitLogResponse> commitLogs) {
        return new CardResponse(
                card.getId(),
                card.getTitle(),
                card.getStatus(),
                card.getDueDate(),
                card.getMemo(),
                card.getCreatedBy(),
                card.getMergedAt(),
                card.getAssignees().stream().map(AssigneeResponse::from).toList(),
                card.getBranches().stream().map(BranchResponse::from).toList(),
                commitLogs
        );
    }
}