package com.capstone.gitmanager.board.dto;

import jakarta.validation.constraints.NotBlank;

public record CardBranchRequest(
        @NotBlank String branchName,
        @NotBlank String repoName
) {}