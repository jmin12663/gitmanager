package com.capstone.gitmanager.github.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record MergePrRequest(
        @NotBlank
        @Pattern(regexp = "merge|squash|rebase")
        String mergeMethod
) {}
