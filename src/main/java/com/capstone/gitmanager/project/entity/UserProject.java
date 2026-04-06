package com.capstone.gitmanager.project.entity;

import com.capstone.gitmanager.auth.entity.User;
import jakarta.persistence.*;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

import static lombok.AccessLevel.PROTECTED;

@Entity
@Table(name = "user_project")
@IdClass(UserProjectId.class)
@Getter
@NoArgsConstructor(access = PROTECTED)
public class UserProject {

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProjectRole role;

    @Column(nullable = false)
    private LocalDateTime joinedAt;

    @Builder
    private UserProject(User user, Project project, ProjectRole role) {
        this.user = user;
        this.project = project;
        this.role = role;
        this.joinedAt = LocalDateTime.now();
    }

    public void assignOwner() {
        this.role = ProjectRole.OWNER;
    }
}