package com.capstone.gitmanager.project.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;

public record ProjectUpdateRequest(
        @NotBlank String name,
        String description,
        LocalDate startDate,
        LocalDate endDate
) {}