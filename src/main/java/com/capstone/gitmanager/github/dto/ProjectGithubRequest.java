package com.capstone.gitmanager.github.dto;

import jakarta.validation.constraints.NotBlank;

public record ProjectGithubRequest(
        @NotBlank String repoUrl,
        @NotBlank String repoName,
        @NotBlank String pat,
        @NotBlank String webhookSecret
) {}