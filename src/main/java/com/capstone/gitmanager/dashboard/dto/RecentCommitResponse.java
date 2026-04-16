package com.capstone.gitmanager.dashboard.dto;

import com.capstone.gitmanager.board.entity.CommitLog;

import java.time.LocalDateTime;

public record RecentCommitResponse(
        String commitSha,
        String message,
        String author,
        LocalDateTime committedAt,
        String cardTitle
) {
    public static RecentCommitResponse from(CommitLog commitLog) {
        return new RecentCommitResponse(
                commitLog.getCommitSha(),
                commitLog.getMessage(),
                commitLog.getAuthor(),
                commitLog.getCommittedAt(),
                commitLog.getCard().getTitle()
        );
    }
}
