package com.capstone.gitmanager.github.dto;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public record PullRequestResponse(
        int number,
        String title,
        String state,
        String htmlUrl,
        String author,
        List<ReviewerInfo> reviewers,
        String createdAt,
        String branchName,
        String baseBranch,
        String headSha
) {
    public record ReviewerInfo(String login, String state) {}

    @SuppressWarnings("unchecked")
    public static PullRequestResponse from(Map<String, Object> pr, List<Map<String, Object>> reviews) {
        boolean draft = Boolean.TRUE.equals(pr.get("draft"));
        String ghState = (String) pr.get("state");
        Object mergedAt = pr.get("merged_at");

        String state;
        if (mergedAt != null) {
            state = "MERGED";
        } else if ("closed".equals(ghState)) {
            state = "CLOSED";
        } else if (draft) {
            state = "DRAFT";
        } else {
            state = "OPEN";
        }

        String author = "";
        Map<String, Object> user = (Map<String, Object>) pr.get("user");
        if (user != null) author = (String) user.getOrDefault("login", "");

        String branchName = "";
        String headSha = "";
        Map<String, Object> head = (Map<String, Object>) pr.get("head");
        if (head != null) {
            branchName = (String) head.getOrDefault("ref", "");
            headSha = (String) head.getOrDefault("sha", "");
        }

        String baseBranch = "";
        Map<String, Object> base = (Map<String, Object>) pr.get("base");
        if (base != null) {
            baseBranch = (String) base.getOrDefault("ref", "");
        }

        List<ReviewerInfo> reviewerInfos = buildReviewerInfos(pr, reviews);

        return new PullRequestResponse(
                ((Number) pr.get("number")).intValue(),
                (String) pr.getOrDefault("title", ""),
                state,
                (String) pr.getOrDefault("html_url", ""),
                author,
                reviewerInfos,
                (String) pr.getOrDefault("created_at", ""),
                branchName,
                baseBranch,
                headSha
        );
    }

    @SuppressWarnings("unchecked")
    private static List<ReviewerInfo> buildReviewerInfos(Map<String, Object> pr, List<Map<String, Object>> reviews) {
        Map<String, String> latestByUser = new LinkedHashMap<>();

        if (reviews != null) {
            for (Map<String, Object> review : reviews) {
                Map<String, Object> reviewer = (Map<String, Object>) review.get("user");
                String reviewState = (String) review.get("state");
                if (reviewer != null && reviewState != null && !"COMMENTED".equals(reviewState) && !"DISMISSED".equals(reviewState)) {
                    latestByUser.put((String) reviewer.get("login"), reviewState);
                }
            }
        }

        List<Map<String, Object>> requested = (List<Map<String, Object>>) pr.get("requested_reviewers");
        if (requested != null) {
            for (Map<String, Object> rr : requested) {
                String login = (String) rr.get("login");
                latestByUser.putIfAbsent(login, "PENDING");
            }
        }

        List<ReviewerInfo> result = new ArrayList<>();
        latestByUser.forEach((login, s) -> result.add(new ReviewerInfo(login, s)));
        return result;
    }
}
