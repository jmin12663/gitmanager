package com.capstone.gitmanager.github.service;

import com.capstone.gitmanager.board.entity.*;
import com.capstone.gitmanager.board.repository.CardBranchRepository;
import com.capstone.gitmanager.board.repository.CardRepository;
import com.capstone.gitmanager.board.repository.CommitLogRepository;
import com.capstone.gitmanager.common.exception.CustomException;
import com.capstone.gitmanager.common.exception.ErrorCode;
import com.capstone.gitmanager.github.dto.WebhookPayload;
import com.capstone.gitmanager.github.entity.ProjectGithub;
import com.capstone.gitmanager.github.repository.ProjectGithubRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WebhookService {

    private final ProjectGithubRepository projectGithubRepository;
    private final CardRepository cardRepository;
    private final CardBranchRepository cardBranchRepository;
    private final CommitLogRepository commitLogRepository;

    public void verifySignature(String repoName, String signature, String payload) {
        ProjectGithub github = projectGithubRepository.findByRepoName(repoName)
                .orElseThrow(() -> new CustomException(ErrorCode.GITHUB_NOT_CONFIGURED));

        String expected = computeHmacSha256(github.getWebhookSecret(), payload);
        if (!expected.equals(signature)) {
            throw new CustomException(ErrorCode.WEBHOOK_SIGNATURE_INVALID);
        }
    }

    @Transactional
    public void handleCreate(WebhookPayload payload) {
        // tag 생성은 무시
        if (!"branch".equals(payload.refType)) return;

        String branchName = payload.ref;
        String repoName = payload.repository.name;

        // 이미 연결된 카드가 있으면 생성하지 않음
        boolean alreadyLinked = cardBranchRepository
                .findByRepoNameAndIdBranchName(repoName, branchName)
                .isPresent();
        if (alreadyLinked) return;

        ProjectGithub github = projectGithubRepository.findByRepoName(repoName)
                .orElseThrow(() -> new CustomException(ErrorCode.GITHUB_NOT_CONFIGURED));

        Card card = Card.builder()
                .projectId(github.getProjectId())
                .title(branchName)
                .createdBy(0L)  // 시스템 생성 카드
                .build();
        card.changeStatus(CardStatus.IN_PROGRESS);
        cardRepository.save(card);

        CardBranch branch = new CardBranch(card, branchName, repoName);
        cardBranchRepository.save(branch);
    }

    @Transactional
    public void handlePush(WebhookPayload payload) {
        if (payload.commits == null || payload.commits.isEmpty()) return;

        String branchName = extractBranchName(payload.ref);
        String repoName = payload.repository.name;

        cardBranchRepository.findByRepoNameAndIdBranchName(repoName, branchName)
                .ifPresent(cardBranch -> {
                    Card card = cardBranch.getCard();
                    // 진입점 A(카드 먼저 생성) 대응: BACKLOG 상태일 때만 IN_PROGRESS로 전환
                    if (card.getStatus() == CardStatus.BACKLOG) {
                        card.changeStatus(CardStatus.IN_PROGRESS);
                    }

                    payload.commits.forEach(commit -> {
                        if (commitLogRepository.existsByCommitSha(commit.id)) return;

                        LocalDateTime committedAt = parseTimestamp(commit.timestamp);
                        CommitLog log = CommitLog.builder()
                                .card(card)
                                .commitSha(commit.id)
                                .message(commit.message)
                                .author(commit.author != null ? commit.author.name : null)
                                .committedAt(committedAt)
                                .build();
                        commitLogRepository.save(log);
                    });
                });
    }

    @Transactional
    public void handleDelete(WebhookPayload payload) {
        if (!"branch".equals(payload.refType)) return;

        String branchName = payload.ref;
        String repoName = payload.repository.name;

        cardBranchRepository.findByRepoNameAndIdBranchName(repoName, branchName)
                .ifPresent(cardBranchRepository::delete);
    }

    @Transactional
    public void handlePullRequest(WebhookPayload payload) {
        if (payload.pullRequest == null || !payload.pullRequest.merged) return;

        // main 브랜치로 merge된 경우만 처리
        String baseBranch = payload.pullRequest.base.ref;
        if (!"main".equals(baseBranch) && !"master".equals(baseBranch)) return;

        String branchName = payload.pullRequest.head.ref;
        String repoName = payload.repository.name;

        cardBranchRepository.findByRepoNameAndIdBranchName(repoName, branchName)
                .ifPresent(cardBranch -> {
                    cardBranch.getCard().markMerged(LocalDateTime.now());
                });
    }

    private String extractBranchName(String ref) {
        // "refs/heads/feature-login" → "feature-login"
        if (ref != null && ref.startsWith("refs/heads/")) {
            return ref.substring("refs/heads/".length());
        }
        return ref;
    }

    private String computeHmacSha256(String secret, String payload) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec keySpec = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(keySpec);
            byte[] hash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            return "sha256=" + HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    private LocalDateTime parseTimestamp(String timestamp) {
        try {
            return LocalDateTime.parse(timestamp, DateTimeFormatter.ISO_OFFSET_DATE_TIME);
        } catch (Exception e) {
            return LocalDateTime.now();
        }
    }
}