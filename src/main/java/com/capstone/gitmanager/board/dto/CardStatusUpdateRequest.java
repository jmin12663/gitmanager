package com.capstone.gitmanager.board.dto;

import com.capstone.gitmanager.board.entity.CardStatus;
import jakarta.validation.constraints.NotNull;

public record CardStatusUpdateRequest(
        @NotNull CardStatus status
) {}