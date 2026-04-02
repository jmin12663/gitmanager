package com.capstone.gitmanager.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank(message = "아이디 또는 이메일은 필수입니다.")
        String identifier,

        @NotBlank(message = "비밀번호는 필수입니다.")
        String password
) {}