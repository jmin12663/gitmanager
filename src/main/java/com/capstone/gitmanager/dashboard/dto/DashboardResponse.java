package com.capstone.gitmanager.dashboard.dto;

import java.util.List;

public record DashboardResponse(
        CardStatusSummary cardSummary,
        List<RecentCommitResponse> recentCommits,
        List<MemberSummaryResponse> members
) {}
