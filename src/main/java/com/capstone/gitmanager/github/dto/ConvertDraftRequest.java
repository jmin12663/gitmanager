package com.capstone.gitmanager.github.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ConvertDraftRequest(
        @NotNull Boolean draft,
        @NotBlank String nodeId
) {}
