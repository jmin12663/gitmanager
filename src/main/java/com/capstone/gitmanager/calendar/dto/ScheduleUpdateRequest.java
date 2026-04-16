package com.capstone.gitmanager.calendar.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record ScheduleUpdateRequest(
        @NotBlank String title,
        @NotNull LocalDate startDate,
        @NotNull LocalDate endDate
) {}