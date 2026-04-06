package com.capstone.gitmanager.project.dto;

import com.capstone.gitmanager.project.entity.Project;
import com.capstone.gitmanager.project.entity.ProjectRole;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record ProjectResponse(
        Long id,
        String name,
        String description,
        LocalDate startDate,
        LocalDate endDate,
        Long createdBy,
        LocalDateTime createdAt,
        ProjectRole myRole
) {
    public static ProjectResponse from(Project project, ProjectRole myRole) {
        return new ProjectResponse(
                project.getId(),
                project.getName(),
                project.getDescription(),
                project.getStartDate(),
                project.getEndDate(),
                project.getCreatedBy(),
                project.getCreatedAt(),
                myRole
        );
    }
}