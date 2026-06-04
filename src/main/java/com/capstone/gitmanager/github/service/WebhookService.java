package com.capstone.gitmanager.github.service;

import com.capstone.gitmanager.board.dto.BoardEventMessage;
import com.capstone.gitmanager.board.dto.CardSummaryResponse;
import com.capstone.gitmanager.board.entity.*;
import com.capstone.gitmanager.board.repository.CardBranchRepository;
import com.capstone.gitmanager.board.repository.CardRepository;
import com.capstone.gitmanager.board.repository.CommentRepository;
import com.capstone.gitmanager.board.repository.CommitLogRepository;
import com.capstone.gitmanager.board.service.BoardWebSocketService;
import com.capstone.gitmanager.common.exception.CustomException;
import com.capstone.gitmanager.common.exception.ErrorCode;
import com.capstone.gitmanager.github.dto.WebhookPayload;
import com.capstone.gitmanager.github.entity.ProjectGithub;
import com.capstone.gitmanager.github.repository.ProjectGithubRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

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
    private final CommentRepository commentRepository;
    private final BoardWebSocketService boardWsService;

    public ProjectGithub verifySignature(String repoName, String signature, String payload) {
        ProjectGithub github = projectGithubRepository.findByRepoName(repoName)
                .orElseThrow(() -> new CustomException(ErrorCode.GITHUB_NOT_CONFIGURED));

        String expected = computeHmacSha256(github.getWebhookSecret(), payload);
        if (!expected.equals(signature)) {
            throw new CustomException(ErrorCode.WEBHOOK_SIGNATURE_INVALID);
        }
        return github;
    }

    @Transactional
    public void handleCreate(WebhookPayload payload, ProjectGithub github) {
        // tag 생성은 무시
        if (!"branch".equals(payload.refType)) return;

        String branchName = payload.ref;
        String repoName = payload.repository.name;

        // 이미 연결된 카드가 있으면 생성하지 않음
        boolean alreadyLinked = cardBranchRepository
                .findFirstByRepoNameAndIdBranchName(repoName, branchName)
                .isPresent();
        if (alreadyLinked) return;

        Card card = Card.builder()
                .projectId(github.getProjectId())
                .title(branchName)
                .createdBy(0L)  // 시스템 생성 카드
                .build();
        card.changeStatus(CardStatus.IN_PROGRESS);
        cardRepository.save(card);

        CardBranch branch = new CardBranch(card, branchName, repoName);
        cardBranchRepository.save(branch);

        CardSummaryResponse summary = CardSummaryResponse.from(card, 0L);
        broadcastAfterCommit(github.getProjectId(), new BoardEventMessage(BoardEventMessage.CARD_CREATED, card.getId(), summary, null));
    }

    @Transactional
    public void handlePush(WebhookPayload payload) {
        if (payload.commits == null || payload.commits.isEmpty()) return;

        String branchName = extractBranchName(payload.ref);
        String repoName = payload.repository.name;

        cardBranchRepository.findFirstByRepoNameAndIdBranchName(repoName, branchName)
                .ifPresent(cardBranch -> {
                    Card card = cardBranch.getCard();
                    boolean statusChanged = false;
                    if (card.getStatus() == CardStatus.BACKLOG) {
                        card.changeStatus(CardStatus.IN_PROGRESS);
                        statusChanged = true;
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

                    if (statusChanged) {
                        long count = commentRepository.countByCardId(card.getId());
                        CardSummaryResponse summary = CardSummaryResponse.from(card, count);
                        broadcastAfterCommit(card.getProjectId(), new BoardEventMessage(BoardEventMessage.CARD_STATUS_CHANGED, card.getId(), summary, null));
                    }
                });
    }

    @Transactional
    public void handleDelete(WebhookPayload payload) {
        if (!"branch".equals(payload.refType)) return;

        String branchName = payload.ref;
        String repoName = payload.repository.name;

        cardBranchRepository.findFirstByRepoNameAndIdBranchName(repoName, branchName)
                .ifPresent(cardBranchRepository::delete);
    }

    @Transactional
    public void handlePullRequestReview(WebhookPayload payload) {
        if (payload.pullRequest == null || payload.review == null
                || payload.pullRequest.head == null) return;

        String branchName = payload.pullRequest.head.ref;
        String repoName = payload.repository.name;
        String reviewState = payload.review.state;
        String reviewer = payload.review.user != null ? payload.review.user.login : "unknown";

        log.info("[Webhook] PR review 수신. branch={}, reviewer={}, state={}", branchName, reviewer, reviewState);

        cardBranchRepository.findFirstByRepoNameAndIdBranchName(repoName, branchName)
                .ifPresent(cardBranch -> {
                    Long cardId = cardBranch.getCard().getId();
                    Long projectId = cardBranch.getCard().getProjectId();
                    broadcastAfterCommit(projectId, new BoardEventMessage(BoardEventMessage.PR_REVIEW_UPDATED, cardId, null, null));
                });
    }

    @Transactional
    public void handlePullRequest(WebhookPayload payload) {
        if (payload.pullRequest == null || !payload.pullRequest.merged) return;

        String branchName = payload.pullRequest.head.ref;
        String repoName = payload.repository.name;

        cardBranchRepository.findFirstByRepoNameAndIdBranchName(repoName, branchName)
                .ifPresent(cardBranch -> {
                    Card card = cardBranch.getCard();
                    card.markMerged(LocalDateTime.now());

                    long count = commentRepository.countByCardId(card.getId());
                    CardSummaryResponse summary = CardSummaryResponse.from(card, count);
                    broadcastAfterCommit(card.getProjectId(), new BoardEventMessage(BoardEventMessage.CARD_STATUS_CHANGED, card.getId(), summary, null));
                });
    }

    private void broadcastAfterCommit(Long projectId, BoardEventMessage message) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                boardWsService.broadcast(projectId, message);
            }
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