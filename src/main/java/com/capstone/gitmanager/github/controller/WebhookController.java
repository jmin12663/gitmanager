package com.capstone.gitmanager.github.controller;

import com.capstone.gitmanager.common.dto.ApiResponse;
import com.capstone.gitmanager.common.exception.CustomException;
import com.capstone.gitmanager.common.exception.ErrorCode;
import com.capstone.gitmanager.github.dto.WebhookPayload;
import com.capstone.gitmanager.github.service.WebhookService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/webhook")
@RequiredArgsConstructor
public class WebhookController {

    private final WebhookService webhookService;
    private final ObjectMapper objectMapper;

    @PostMapping("/github")
    public ApiResponse<Void> handleWebhook(
            @RequestHeader("X-GitHub-Event") String event,
            @RequestHeader("X-Hub-Signature-256") String signature,
            @RequestBody String rawBody
    ) {
        WebhookPayload payload;
        try {
            payload = objectMapper.readValue(rawBody, WebhookPayload.class);
        } catch (JsonProcessingException e) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        if (payload.repository == null || payload.repository.name == null) {
            throw new CustomException(ErrorCode.GITHUB_NOT_CONFIGURED);
        }
        webhookService.verifySignature(payload.repository.name, signature, rawBody);

        switch (event) {
            case "create" -> webhookService.handleCreate(payload);
            case "delete" -> webhookService.handleDelete(payload);
            case "push" -> webhookService.handlePush(payload);
            case "pull_request" -> webhookService.handlePullRequest(payload);
            default -> { /* 처리하지 않는 이벤트 무시 */ }
        }

        return ApiResponse.ok();
    }
}