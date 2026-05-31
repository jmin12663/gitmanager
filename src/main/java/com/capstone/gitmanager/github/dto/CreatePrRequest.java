package com.capstone.gitmanager.github.dto;

import jakarta.validation.constraints.NotBlank;

public record CreatePrRequest(
        @NotBlank String title,
        String body,
        @NotBlank String head,
        @NotBlank String base
) {}
