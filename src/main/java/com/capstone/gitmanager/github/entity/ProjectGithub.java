package com.capstone.gitmanager.github.entity;

import jakarta.persistence.*;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import static lombok.AccessLevel.PROTECTED;

@Entity
@Table(name = "project_github")
@Getter
@NoArgsConstructor(access = PROTECTED)
public class ProjectGithub {

    @Id
    @Column(name = "project_id")
    private Long projectId;

    @Column(nullable = false)
    private String repoUrl;

    @Column(nullable = false)
    private String repoName;

    @Column(nullable = false)
    private String patEncrypted;

    @Column(nullable = false)
    private String webhookSecret;

    @Builder
    private ProjectGithub(Long projectId, String repoUrl, String repoName, String patEncrypted, String webhookSecret) {
        this.projectId = projectId;
        this.repoUrl = repoUrl;
        this.repoName = repoName;
        this.patEncrypted = patEncrypted;
        this.webhookSecret = webhookSecret;
    }

    public void update(String repoUrl, String repoName, String patEncrypted, String webhookSecret) {
        this.repoUrl = repoUrl;
        this.repoName = repoName;
        this.patEncrypted = patEncrypted;
        this.webhookSecret = webhookSecret;
    }
}
