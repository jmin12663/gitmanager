package com.capstone.gitmanager.dashboard.dto;

import com.capstone.gitmanager.project.entity.ProjectRole;
import com.capstone.gitmanager.project.entity.UserProject;

public record MemberSummaryResponse(
        Long userId,
        String name,
        ProjectRole role,
        int assignedCardCount
) {
    public static MemberSummaryResponse from(UserProject userProject, int assignedCardCount) {
        return new MemberSummaryResponse(
                userProject.getUser().getId(),
                userProject.getUser().getName(),
                userProject.getRole(),
                assignedCardCount
        );
    }
}
