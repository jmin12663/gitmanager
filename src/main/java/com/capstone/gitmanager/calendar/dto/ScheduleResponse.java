package com.capstone.gitmanager.calendar.dto;

import com.capstone.gitmanager.calendar.entity.Schedule;

import java.time.LocalDate;

public record ScheduleResponse(
        Long id,
        String title,
        LocalDate startDate,
        LocalDate endDate,
        Long createdBy
) {
    public static ScheduleResponse from(Schedule schedule) {
        return new ScheduleResponse(
                schedule.getId(),
                schedule.getTitle(),
                schedule.getStartDate(),
                schedule.getEndDate(),
                schedule.getCreatedBy()
        );
    }
}