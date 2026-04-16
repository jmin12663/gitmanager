package com.capstone.gitmanager.board.dto;

import com.capstone.gitmanager.board.entity.CardAssignee;

public record AssigneeResponse(
        Long userId,
        String name
) {
    public static AssigneeResponse from(CardAssignee assignee) {
        return new AssigneeResponse(
                assignee.getUser().getId(),
                assignee.getUser().getName()
        );
    }
}