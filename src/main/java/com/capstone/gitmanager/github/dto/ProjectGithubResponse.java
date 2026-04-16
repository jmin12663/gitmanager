package com.capstone.gitmanager.github.dto;

import com.capstone.gitmanager.github.entity.ProjectGithub;

public record ProjectGithubResponse(
        Long projectId,
        String repoUrl,
        String repoName
) {
    public static ProjectGithubResponse from(ProjectGithub github) {
        return new ProjectGithubResponse(
                github.getProjectId(),
                github.getRepoUrl(),
                github.getRepoName()
        );
    }
}