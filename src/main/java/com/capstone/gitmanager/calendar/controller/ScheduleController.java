package com.capstone.gitmanager.calendar.controller;

import com.capstone.gitmanager.calendar.dto.ScheduleCreateRequest;
import com.capstone.gitmanager.calendar.dto.ScheduleResponse;
import com.capstone.gitmanager.calendar.dto.ScheduleUpdateRequest;
import com.capstone.gitmanager.calendar.service.ScheduleService;
import com.capstone.gitmanager.common.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/projects/{projectId}/schedules")
@RequiredArgsConstructor
public class ScheduleController {

    private final ScheduleService scheduleService;

    @GetMapping
    public ApiResponse<List<ScheduleResponse>> getSchedules(
            @PathVariable Long projectId,
            @AuthenticationPrincipal Long userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ApiResponse.ok(scheduleService.getSchedules(projectId, userId, from, to));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ScheduleResponse> createSchedule(
            @PathVariable Long projectId,
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody ScheduleCreateRequest request
    ) {
        return ApiResponse.ok(scheduleService.createSchedule(projectId, userId, request));
    }

    @PatchMapping("/{scheduleId}")
    public ApiResponse<ScheduleResponse> updateSchedule(
            @PathVariable Long projectId,
            @PathVariable Long scheduleId,
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody ScheduleUpdateRequest request
    ) {
        return ApiResponse.ok(scheduleService.updateSchedule(projectId, userId, scheduleId, request));
    }

    @DeleteMapping("/{scheduleId}")
    public ApiResponse<Void> deleteSchedule(
            @PathVariable Long projectId,
            @PathVariable Long scheduleId,
            @AuthenticationPrincipal Long userId
    ) {
        scheduleService.deleteSchedule(projectId, userId, scheduleId);
        return ApiResponse.ok();
    }
}