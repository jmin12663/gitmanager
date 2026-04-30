package com.capstone.gitmanager.common.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {

    // Common
    INVALID_INPUT(HttpStatus.BAD_REQUEST, "INVALID_INPUT", "잘못된 입력입니다."),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "인증이 필요합니다."),
    FORBIDDEN(HttpStatus.FORBIDDEN, "FORBIDDEN", "접근 권한이 없습니다."),
    NOT_FOUND(HttpStatus.NOT_FOUND, "NOT_FOUND", "리소스를 찾을 수 없습니다."),
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_SERVER_ERROR", "서버 오류가 발생했습니다."),

    // Auth
    EMAIL_ALREADY_EXISTS(HttpStatus.CONFLICT, "EMAIL_ALREADY_EXISTS", "이미 사용 중인 이메일입니다."),
    LOGIN_ID_ALREADY_EXISTS(HttpStatus.CONFLICT, "LOGIN_ID_ALREADY_EXISTS", "이미 사용 중인 아이디입니다."),
    EMAIL_NOT_VERIFIED(HttpStatus.UNAUTHORIZED, "EMAIL_NOT_VERIFIED", "이메일 인증이 필요합니다."),
    INVALID_EMAIL_TOKEN(HttpStatus.BAD_REQUEST, "INVALID_EMAIL_TOKEN", "유효하지 않은 이메일 인증 번호입니다."),
    EMAIL_TOKEN_EXPIRED(HttpStatus.BAD_REQUEST, "EMAIL_TOKEN_EXPIRED", "만료된 이메일 인증 번호입니다."),
    EMAIL_NOT_PRE_VERIFIED(HttpStatus.BAD_REQUEST, "EMAIL_NOT_PRE_VERIFIED", "이메일 인증을 먼저 완료해주세요."),
    INVALID_PASSWORD(HttpStatus.UNAUTHORIZED, "INVALID_PASSWORD", "비밀번호가 올바르지 않습니다."),
    WRONG_PASSWORD(HttpStatus.UNAUTHORIZED, "WRONG_PASSWORD", "현재 비밀번호가 올바르지 않습니다."),
    INVALID_TOKEN(HttpStatus.UNAUTHORIZED, "INVALID_TOKEN", "유효하지 않은 토큰입니다."),
    TOKEN_EXPIRED(HttpStatus.UNAUTHORIZED, "TOKEN_EXPIRED", "만료된 토큰입니다."),
    REFRESH_TOKEN_NOT_FOUND(HttpStatus.UNAUTHORIZED, "REFRESH_TOKEN_NOT_FOUND", "Refresh Token을 찾을 수 없습니다."),

    // User
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "사용자를 찾을 수 없습니다."),

    // Project
    PROJECT_NOT_FOUND(HttpStatus.NOT_FOUND, "PROJECT_NOT_FOUND", "프로젝트를 찾을 수 없습니다."),
    PROJECT_MEMBER_NOT_FOUND(HttpStatus.NOT_FOUND, "PROJECT_MEMBER_NOT_FOUND", "프로젝트 멤버를 찾을 수 없습니다."),
    ALREADY_PROJECT_MEMBER(HttpStatus.CONFLICT, "ALREADY_PROJECT_MEMBER", "이미 프로젝트 멤버입니다."),
    INVALID_INVITE_CODE(HttpStatus.BAD_REQUEST, "INVALID_INVITE_CODE", "유효하지 않은 초대 코드입니다."),
    NEW_OWNER_REQUIRED(HttpStatus.BAD_REQUEST, "NEW_OWNER_REQUIRED", "탈퇴 전 새 OWNER를 지정해야 합니다."),

    // Card
    CARD_NOT_FOUND(HttpStatus.NOT_FOUND, "CARD_NOT_FOUND", "카드를 찾을 수 없습니다."),
    COMMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "COMMENT_NOT_FOUND", "댓글을 찾을 수 없습니다."),
    BRANCH_NOT_FOUND(HttpStatus.NOT_FOUND, "BRANCH_NOT_FOUND", "연결된 브랜치를 찾을 수 없습니다."),

    // GitHub
    GITHUB_NOT_CONFIGURED(HttpStatus.BAD_REQUEST, "GITHUB_NOT_CONFIGURED", "GitHub 연동이 설정되지 않았습니다."),
    WEBHOOK_SIGNATURE_INVALID(HttpStatus.FORBIDDEN, "WEBHOOK_SIGNATURE_INVALID", "Webhook 서명이 유효하지 않습니다."),

    // File
    INVALID_FILE_TYPE(HttpStatus.BAD_REQUEST, "INVALID_FILE_TYPE", "허용되지 않는 파일 형식입니다."),
    FILE_SIZE_EXCEEDED(HttpStatus.BAD_REQUEST, "FILE_SIZE_EXCEEDED", "파일 크기가 10MB를 초과합니다."),
    FILE_UPLOAD_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "FILE_UPLOAD_FAILED", "파일 업로드에 실패했습니다."),

    // Schedule
    SCHEDULE_NOT_FOUND(HttpStatus.NOT_FOUND, "SCHEDULE_NOT_FOUND", "일정을 찾을 수 없습니다."),

    // Todo
    TODO_NOT_FOUND(HttpStatus.NOT_FOUND, "TODO_NOT_FOUND", "ToDo를 찾을 수 없습니다.");

    private final HttpStatus httpStatus;
    private final String code;
    private final String message;

    ErrorCode(HttpStatus httpStatus, String code, String message) {
        this.httpStatus = httpStatus;
        this.code = code;
        this.message = message;
    }
}