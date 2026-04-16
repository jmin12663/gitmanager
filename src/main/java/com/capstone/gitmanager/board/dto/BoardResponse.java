package com.capstone.gitmanager.board.dto;

import java.util.List;

public record BoardResponse(
        List<CardSummaryResponse> backlog,
        List<CardSummaryResponse> inProgress,
        List<CardSummaryResponse> done
) {}