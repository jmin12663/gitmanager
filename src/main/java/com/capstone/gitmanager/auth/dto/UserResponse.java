package com.capstone.gitmanager.auth.dto;

import com.capstone.gitmanager.auth.entity.User;

public record UserResponse(
        Long userId,
        String githubLogin,
        String name,
        String email,
        String avatarUrl
) {
    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getGithubLogin(),
                user.getName(),
                user.getEmail(),
                user.getAvatarUrl()
        );
    }
}
