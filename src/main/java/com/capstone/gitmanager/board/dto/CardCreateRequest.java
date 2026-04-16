package com.capstone.gitmanager.board.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;
import java.util.List;

public record CardCreateRequest(
        @NotBlank String title,
        LocalDate dueDate,
        String memo,
        List<Long> assigneeIds
) {}