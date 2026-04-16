package com.capstone.gitmanager.dashboard.dto;

public record CardStatusSummary(
        int backlog,
        int inProgress,
        int done,
        int total,
        int progressRate
) {}
