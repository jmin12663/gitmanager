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
    private String loginId;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private boolean emailVerified = false;

    @Builder
    private User(String loginId, String email, String password, String name) {
        this.loginId = loginId;
        this.email = email;
        this.password = password;
        this.name = name;
    }

    public void verifyEmail() {
        this.emailVerified = true;
    }

    public void updateName(String name) {
        this.name = name;
    }

    public void updateLoginId(String loginId) {
        this.loginId = loginId;
    }

    public void changePassword(String encodedPassword) {
        this.password = encodedPassword;
    }
}