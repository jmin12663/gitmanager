package com.capstone.gitmanager.board.dto;

public record BoardEventMessage(
        String type,
        Long cardId,
        CardSummaryResponse card,   // CARD_DELETED 시 null
        Long commentCount           // COMMENT_COUNT_CHANGED 시에만 사용
) {
    public static final String CARD_CREATED = "CARD_CREATED";
    public static final String CARD_UPDATED = "CARD_UPDATED";
    public static final String CARD_STATUS_CHANGED = "CARD_STATUS_CHANGED";
    public static final String CARD_DELETED = "CARD_DELETED";
    public static final String COMMENT_COUNT_CHANGED = "COMMENT_COUNT_CHANGED";
    public static final String PR_REVIEW_UPDATED = "PR_REVIEW_UPDATED";
}