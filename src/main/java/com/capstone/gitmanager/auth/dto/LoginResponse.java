package com.capstone.gitmanager.auth.dto;

public record LoginResponse(
        Long userId,
        String name,
        String email,
        String accessToken
) {}