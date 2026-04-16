package com.capstone.gitmanager.board.dto;

import com.capstone.gitmanager.board.entity.Comment;

import java.time.LocalDateTime;

public record CommentResponse(
        Long id,
        Long userId,
        String userName,
        String content,
        LocalDateTime createdAt
) {
    public static CommentResponse from(Comment comment) {
        return new CommentResponse(
                comment.getId(),
                comment.getUser().getId(),
                comment.getUser().getName(),
                comment.getContent(),
                comment.getCreatedAt()
        );
    }
}