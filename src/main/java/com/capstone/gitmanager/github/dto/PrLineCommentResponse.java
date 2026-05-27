package com.capstone.gitmanager.github.dto;

import java.util.Map;

public record PrLineCommentResponse(
        long id,
        String path,
        Integer line,
        String side,
        String body,
        String author,
        String createdAt,
        Long inReplyToId
) {
    @SuppressWarnings("unchecked")
    public static PrLineCommentResponse from(Map<String, Object> c) {
        Map<String, Object> user = (Map<String, Object>) c.get("user");
        String author = user != null ? (String) user.getOrDefault("login", "") : "";

        Object lineVal = c.get("line");
        Integer line = lineVal != null ? ((Number) lineVal).intValue() : null;

        Object replyToVal = c.get("in_reply_to_id");
        Long inReplyToId = replyToVal != null ? ((Number) replyToVal).longValue() : null;

        return new PrLineCommentResponse(
                ((Number) c.get("id")).longValue(),
                (String) c.getOrDefault("path", ""),
                line,
                (String) c.getOrDefault("side", "RIGHT"),
                (String) c.getOrDefault("body", ""),
                author,
                (String) c.getOrDefault("created_at", ""),
                inReplyToId
        );
    }
}