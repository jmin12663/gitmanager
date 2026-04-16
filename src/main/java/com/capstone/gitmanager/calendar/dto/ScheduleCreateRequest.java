package com.capstone.gitmanager.calendar.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record ScheduleCreateRequest(
        @NotBlank String title,
        @NotNull LocalDate startDate,
        @NotNull LocalDate endDate
) {}