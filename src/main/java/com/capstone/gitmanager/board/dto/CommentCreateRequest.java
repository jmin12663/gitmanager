package com.capstone.gitmanager.board.dto;

import jakarta.validation.constraints.NotBlank;

public record CommentCreateRequest(
        @NotBlank String content
) {}