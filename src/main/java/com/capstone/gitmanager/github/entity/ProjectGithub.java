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

    @Column(nullable = false, length = 500)
    private String oauthTokenEncrypted;

    @Column(nullable = false)
    private String webhookSecret;

    @Column
    private Long webhookId;

    @Builder
    private ProjectGithub(Long projectId, String repoUrl, String repoName,
                          String oauthTokenEncrypted, String webhookSecret, Long webhookId) {
        this.projectId = projectId;
        this.repoUrl = repoUrl;
        this.repoName = repoName;
        this.oauthTokenEncrypted = oauthTokenEncrypted;
        this.webhookSecret = webhookSecret;
        this.webhookId = webhookId;
    }

    public void update(String repoUrl, String repoName, String oauthTokenEncrypted,
                       String webhookSecret, Long webhookId) {
        this.repoUrl = repoUrl;
        this.repoName = repoName;
        this.oauthTokenEncrypted = oauthTokenEncrypted;
        this.webhookSecret = webhookSecret;
        this.webhookId = webhookId;
    }
}
