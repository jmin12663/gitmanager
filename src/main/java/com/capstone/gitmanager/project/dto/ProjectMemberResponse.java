package com.capstone.gitmanager.project.dto;

import com.capstone.gitmanager.project.entity.ProjectRole;
import com.capstone.gitmanager.project.entity.UserProject;

import java.time.LocalDateTime;

public record ProjectMemberResponse(
        Long userId,
        String loginId,
        String name,
        ProjectRole role,
        LocalDateTime joinedAt
) {
    public static ProjectMemberResponse from(UserProject up) {
        return new ProjectMemberResponse(
                up.getUser().getId(),
                up.getUser().getLoginId(),
                up.getUser().getName(),
                up.getRole(),
                up.getJoinedAt()
        );
    }
}