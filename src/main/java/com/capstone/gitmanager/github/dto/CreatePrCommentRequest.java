package com.capstone.gitmanager.github.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

public record CreatePrCommentRequest(
        @NotBlank String body,
        @NotBlank String commitId,
        @NotBlank String path,
        @Positive int line,
        @NotBlank String side
) {}
