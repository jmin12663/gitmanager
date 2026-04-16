package com.capstone.gitmanager.board.dto;

import com.capstone.gitmanager.board.entity.CommitLog;

import java.time.LocalDateTime;

public record CommitLogResponse(
        String commitSha,
        String message,
        String author,
        LocalDateTime committedAt
) {
    public static CommitLogResponse from(CommitLog log) {
        return new CommitLogResponse(log.getCommitSha(), log.getMessage(), log.getAuthor(), log.getCommittedAt());
    }
}