package com.capstone.gitmanager.auth.entity;

import com.capstone.gitmanager.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import static lombok.AccessLevel.PROTECTED;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = PROTECTED)
public class User extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private Long githubId;

    @Column(nullable = false, unique = true)
    private String githubLogin;

    @Column(nullable = false)
    private String githubTokenEncrypted;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String name;

    @Column
    private String avatarUrl;

    @Builder
    private User(Long githubId, String githubLogin, String githubTokenEncrypted,
                 String email, String name, String avatarUrl) {
        this.githubId = githubId;
        this.githubLogin = githubLogin;
        this.githubTokenEncrypted = githubTokenEncrypted;
        this.email = email;
        this.name = name;
        this.avatarUrl = avatarUrl;
    }

    public void updateName(String name) {
        this.name = name;
    }

    public void updateGithubToken(String encryptedToken) {
        this.githubTokenEncrypted = encryptedToken;
    }

    public void updateGithubLogin(String githubLogin) {
        this.githubLogin = githubLogin;
    }

    public void updateAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }
}