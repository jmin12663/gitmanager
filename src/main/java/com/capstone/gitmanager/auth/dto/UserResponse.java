package com.capstone.gitmanager.auth.dto;

import com.capstone.gitmanager.auth.entity.User;

public record UserResponse(
        Long userId,
        String loginId,
        String name,
        String email
) {
    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getLoginId(), user.getName(), user.getEmail());
    }
}