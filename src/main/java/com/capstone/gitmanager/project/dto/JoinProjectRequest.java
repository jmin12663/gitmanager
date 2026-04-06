package com.capstone.gitmanager.project.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record JoinProjectRequest(
        @NotBlank @Size(min = 6, max = 6) String inviteCode
) {}