package com.capstone.gitmanager.dashboard.controller;

import com.capstone.gitmanager.common.dto.ApiResponse;
import com.capstone.gitmanager.dashboard.dto.DashboardResponse;
import com.capstone.gitmanager.dashboard.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/projects/{projectId}/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping
    public ApiResponse<DashboardResponse> getDashboard(
            @PathVariable Long projectId,
            @AuthenticationPrincipal Long userId
    ) {
        return ApiResponse.ok(dashboardService.getDashboard(projectId, userId));
    }
}