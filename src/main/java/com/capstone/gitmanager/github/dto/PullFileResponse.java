package com.capstone.gitmanager.github.dto;

import java.util.Map;

public record PullFileResponse(
        String filename,
        String status,
        int additions,
        int deletions,
        String patch
) {
    @SuppressWarnings("unchecked")
    public static PullFileResponse from(Map<String, Object> file) {
        return new PullFileResponse(
                (String) file.getOrDefault("filename", ""),
                (String) file.getOrDefault("status", "modified"),
                ((Number) file.getOrDefault("additions", 0)).intValue(),
                ((Number) file.getOrDefault("deletions", 0)).intValue(),
                (String) file.get("patch")
        );
    }
}
