package com.capstone.gitmanager.github.service;

import com.capstone.gitmanager.common.exception.CustomException;
import com.capstone.gitmanager.common.exception.ErrorCode;
import com.capstone.gitmanager.github.config.GithubProperties;
import com.capstone.gitmanager.github.config.OAuthStateStore;
import com.capstone.gitmanager.github.config.OAuthStateStore.OAuthState;
import com.capstone.gitmanager.github.dto.ProjectGithubResponse;
import com.capstone.gitmanager.github.entity.ProjectGithub;
import com.capstone.gitmanager.github.repository.ProjectGithubRepository;
import com.capstone.gitmanager.project.entity.ProjectRole;
import com.capstone.gitmanager.project.entity.UserProjectId;
import com.capstone.gitmanager.project.repository.UserProjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.jasypt.encryption.StringEncryptor;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProjectGithubService {

    private final ProjectGithubRepository projectGithubRepository;
    private final UserProjectRepository userProjectRepository;
    private final StringEncryptor jasyptStringEncryptor;
    private final GithubProperties githubProperties;
    private final OAuthStateStore oAuthStateStore;
    private final GithubSyncService githubSyncService;

    private final RestClient restClient = RestClient.create();

    public ProjectGithubResponse getGithubConfig(Long projectId, Long userId) {
        validateMember(projectId, userId);
        return projectGithubRepository.findById(projectId)
                .map(ProjectGithubResponse::from)
                .orElse(null);
    }

    // 1단계: OAuth URL 생성 후 반환 (프론트가 이 URL로 이동)
    public String generateOAuthUrl(Long projectId, Long userId, String repoUrl) {
        validateOwner(projectId, userId);
        String state = oAuthStateStore.save(projectId, userId, repoUrl);
        String encodedRedirectUri = URLEncoder.encode(githubProperties.getRedirectUri(), StandardCharsets.UTF_8);
        return "https://github.com/login/oauth/authorize" +
               "?client_id=" + githubProperties.getClientId() +
               "&redirect_uri=" + encodedRedirectUri +
               "&scope=repo,admin:repo_hook" +
               "&state=" + state;
    }

    // 2단계: GitHub 콜백 처리 (token 교환 → Webhook 등록 → DB 저장)
    @Transactional
    public Long handleOAuthCallback(String code, String state) {
        OAuthState oauthState = oAuthStateStore.getAndRemove(state);
        if (oauthState == null) {
            log.error("[OAuth] state 불일치 또는 만료: {}", state);
            throw new CustomException(ErrorCode.GITHUB_OAUTH_FAILED);
        }

        validateOwner(oauthState.projectId(), oauthState.userId());

        log.info("[OAuth] state 확인 완료. projectId={}, repoUrl={}", oauthState.projectId(), oauthState.repoUrl());
        String accessToken = exchangeCodeForToken(code);
        log.info("[OAuth] token 교환 완료");
        String repoOwner = parseRepoOwner(oauthState.repoUrl());
        String repoName = parseRepoName(oauthState.repoUrl());
        log.info("[OAuth] 파싱 결과 — owner={}, repo={}", repoOwner, repoName);
        Optional<ProjectGithub> existing = projectGithubRepository.findById(oauthState.projectId());
        ProjectGithub existingGithub = existing.orElse(null);
        Long oldWebhookId = existingGithub != null ? existingGithub.getWebhookId() : null;
        String oldRepoOwner = existingGithub != null ? parseRepoOwner(existingGithub.getRepoUrl()) : null;
        String oldRepoName = existingGithub != null ? parseRepoName(existingGithub.getRepoUrl()) : null;
        String oldAccessToken = existingGithub != null
                ? jasyptStringEncryptor.decrypt(existingGithub.getOauthTokenEncrypted())
                : null;
        String webhookSecret = UUID.randomUUID().toString().replace("-", "");
        Long webhookId = registerWebhook(repoOwner, repoName, accessToken, webhookSecret);
        log.info("[OAuth] Webhook 등록 완료. webhookId={}", webhookId);
        String encryptedToken = jasyptStringEncryptor.encrypt(accessToken);

        try {
            if (existingGithub != null) {
                existingGithub.update(oauthState.repoUrl(), repoName, encryptedToken, webhookSecret, webhookId);
                projectGithubRepository.flush();
            } else {
                projectGithubRepository.saveAndFlush(ProjectGithub.builder()
                        .projectId(oauthState.projectId())
                        .repoUrl(oauthState.repoUrl())
                        .repoName(repoName)
                        .oauthTokenEncrypted(encryptedToken)
                        .webhookSecret(webhookSecret)
                        .webhookId(webhookId)
                        .build());
            }
        } catch (RuntimeException e) {
            log.warn("[OAuth] DB 저장 실패. 신규 Webhook 보상 삭제 시도. webhookId={}", webhookId);
            deleteWebhookQuietly(repoOwner, repoName, accessToken, webhookId, "신규 Webhook 보상 삭제");
            throw e;
        }

        deleteWebhookQuietly(oldRepoOwner, oldRepoName, oldAccessToken, oldWebhookId, "기존 Webhook 삭제");

        githubSyncService.syncExistingBranches(repoOwner, repoName, accessToken, oauthState.projectId());

        return oauthState.projectId();
    }

    private String exchangeCodeForToken(String code) {
        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("client_id", githubProperties.getClientId());
        body.add("client_secret", githubProperties.getClientSecret());
        body.add("code", code);
        body.add("redirect_uri", githubProperties.getRedirectUri());

        log.info("[OAuth] token 교환 요청. redirectUri={}", githubProperties.getRedirectUri());

        Map<String, String> response = restClient.post()
                .uri("https://github.com/login/oauth/access_token")
                .header("Accept", "application/json")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(body)
                .retrieve()
                .body(new ParameterizedTypeReference<>() {});

        if (response == null || response.get("access_token") == null) {
            log.error("[OAuth] token 교환 실패. GitHub 응답: {}", response);
            throw new CustomException(ErrorCode.GITHUB_OAUTH_FAILED);
        }
        return response.get("access_token");
    }

    private Long registerWebhook(String owner, String repo, String token, String secret) {
        Map<String, Object> body = Map.of(
                "name", "web",
                "active", true,
                "events", List.of("push", "pull_request", "create", "delete"),
                "config", Map.of(
                        "url", githubProperties.getWebhookBaseUrl() + "/api/webhook/github",
                        "content_type", "json",
                        "secret", secret
                )
        );

        try {
            Map<String, Object> response = restClient.post()
                    .uri("https://api.github.com/repos/{owner}/{repo}/hooks", owner, repo)
                    .header("Authorization", "Bearer " + token)
                    .header("Accept", "application/vnd.github+json")
                    .body(body)
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});

            if (response == null || response.get("id") == null) {
                log.error("[OAuth] Webhook 등록 응답 이상: {}", response);
                throw new CustomException(ErrorCode.GITHUB_OAUTH_FAILED);
            }
            return ((Number) response.get("id")).longValue();
        } catch (CustomException e) {
            throw e;
        } catch (Exception e) {
            log.error("[OAuth] Webhook 등록 실패 — owner={}, repo={}, error={}", owner, repo, e.getMessage());
            throw new CustomException(ErrorCode.GITHUB_OAUTH_FAILED);
        }
    }

    private void deleteWebhookQuietly(String owner, String repo, String token, Long webhookId, String action) {
        if (webhookId == null || owner == null || repo == null || token == null || token.isBlank()) return;
        try {
            restClient.delete()
                    .uri("https://api.github.com/repos/{owner}/{repo}/hooks/{hookId}",
                            owner, repo, webhookId)
                    .header("Authorization", "Bearer " + token)
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception e) {
            log.warn("[OAuth] {} 실패 (무시). owner={}, repo={}, webhookId={}, error={}",
                    action, owner, repo, webhookId, e.getMessage());
        }
    }

    private String parseRepoOwner(String repoUrl) {
        String[] parts = repoUrl.replaceAll("/$", "").split("/");
        return parts[parts.length - 2];
    }

    private String parseRepoName(String repoUrl) {
        String[] parts = repoUrl.replaceAll("/$", "").split("/");
        return parts[parts.length - 1].replaceFirst("\\.git$", "");
    }

    @Transactional
    public void syncGithub(Long projectId, Long userId) {
        validateMember(projectId, userId);
        ProjectGithub github = projectGithubRepository.findById(projectId)
                .orElseThrow(() -> new CustomException(ErrorCode.GITHUB_NOT_CONFIGURED));
        String accessToken = jasyptStringEncryptor.decrypt(github.getOauthTokenEncrypted());
        String owner = parseRepoOwner(github.getRepoUrl());
        githubSyncService.syncExistingBranches(owner, github.getRepoName(), accessToken, projectId);
    }

    private void validateOwner(Long projectId, Long userId) {
        UserProjectId id = new UserProjectId(userId, projectId);
        var up = userProjectRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.FORBIDDEN));
        if (up.getRole() != ProjectRole.OWNER) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }
    }

    private void validateMember(Long projectId, Long userId) {
        if (!userProjectRepository.existsById(new UserProjectId(userId, projectId))) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }
    }
}
