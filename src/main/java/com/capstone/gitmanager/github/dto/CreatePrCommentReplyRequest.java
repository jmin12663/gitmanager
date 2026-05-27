package com.capstone.gitmanager.github.dto;

import jakarta.validation.constraints.NotBlank;

public record CreatePrCommentReplyRequest(
        @NotBlank String body
) {}
