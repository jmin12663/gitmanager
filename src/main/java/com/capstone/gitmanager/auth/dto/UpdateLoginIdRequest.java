package com.capstone.gitmanager.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateLoginIdRequest(
        @NotBlank(message = "아이디는 필수입니다.")
        @Size(min = 5, max = 20, message = "아이디는 5~20자 사이여야 합니다.")
        @Pattern(regexp = "^[a-zA-Z0-9]+$", message = "아이디는 영문과 숫자만 사용 가능합니다.")
        String loginId
) {}