package com.capstone.gitmanager.common.dto;

import com.capstone.gitmanager.common.exception.ErrorCode;

public record ApiResponse<T>(boolean success, T data, ErrorResponse error) {

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, data, null);
    }

    public static ApiResponse<Void> ok() {
        return new ApiResponse<>(true, null, null);
    }

    public static ApiResponse<?> fail(ErrorCode code) {
        return new ApiResponse<>(false, null, new ErrorResponse(code.getCode(), code.getMessage()));
    }
}