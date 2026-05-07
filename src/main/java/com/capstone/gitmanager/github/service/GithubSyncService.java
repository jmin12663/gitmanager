package com.capstone.gitmanager.github.service;

import com.capstone.gitmanager.board.entity.Card;
import com.capstone.gitmanager.board.entity.CardBranch;
import com.capstone.gitmanager.board.entity.CardStatus;
import com.capstone.gitmanager.board.entity.CommitLog;
import com.capstone.gitmanager.board.repository.CardBranchRepository;
import com.capstone.gitmanager.board.repository.CardRepository;
import com.capstone.gitmanager.board.repository.CommitLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class GithubSyncService {

    private static final int MAX_BRANCHES = 50;
    private static final int MAX_COMMITS_PER_BRANCH = 30;

    private final CardRepository cardRepository;
    private final CardBranchRepository cardBranchRepository;
    private final CommitLogRepository commitLogRepository;

    private final RestClient restClient = RestClient.create();

    @Transactional
    public void syncExistingBranches(String owner, String repoName, String accessToken, Long projectId) {
        try {
            String defaultBranch = fetchDefaultBranch(owner, repoName, accessToken);
            List<String> branches = fetchOpenBranches(owner, repoName, accessToken, defaultBranch);

            log.info("[Sync] 동기화 시작. projectId={}, 대상 브랜치 수={}", projectId, branches.size());

            for (String branch : branches) {
                try {
                    syncBranch(owner, repoName, accessToken, projectId, branch, defaultBranch);
                } catch (Exception e) {
                    log.warn("[Sync] 브랜치 동기화 실패, skip. branch={}, error={}", branch, e.getMessage());
                }
            }

            syncMergedPRs(owner, repoName, accessToken);

            log.info("[Sync] 동기화 완료. projectId={}", projectId);
        } catch (Exception e) {
            log.warn("[Sync] 초기 동기화 실패 (OAuth는 정상 완료). error={}", e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    private void syncMergedPRs(String owner, String repoName, String accessToken) {
        try {
            List<Map<String, Object>> prs = restClient.get()
                    .uri("https://api.github.com/repos/{owner}/{repo}/pulls?state=closed&per_page=50",
                            owner, repoName)
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Accept", "application/vnd.github+json")
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});

            if (prs == null) return;

            for (Map<String, Object> pr : prs) {
                if (pr.get("merged_at") == null) continue;

                Map<String, Object> base = (Map<String, Object>) pr.get("base");
                if (base == null) continue;
                String baseBranch = (String) base.get("ref");
                if (!"main".equals(baseBranch) && !"master".equals(baseBranch)) continue;

                Map<String, Object> head = (Map<String, Object>) pr.get("head");
                if (head == null) continue;
                String branchName = (String) head.get("ref");

                cardBranchRepository.findByRepoNameAndIdBranchName(repoName, branchName)
                        .ifPresent(cardBranch -> {
                            if (cardBranch.getCard().getStatus() != CardStatus.DONE) {
                                cardBranch.getCard().markMerged(LocalDateTime.now());
                                log.info("[Sync] merge 처리. branch={}", branchName);
                            }
                        });
            }
        } catch (Exception e) {
            log.warn("[Sync] merged PR 동기화 실패, skip. error={}", e.getMessage());
        }
    }

    private void syncBranch(String owner, String repoName, String accessToken,
                            Long projectId, String branchName, String defaultBranch) {
        // 이미 연결된 브랜치면 skip
        if (cardBranchRepository.findByRepoNameAndIdBranchName(repoName, branchName).isPresent()) {
            log.debug("[Sync] 이미 연결된 브랜치 skip. branch={}", branchName);
            return;
        }

        Card card = Card.builder()
                .projectId(projectId)
                .title(branchName)
                .createdBy(0L)
                .build();
        card.changeStatus(CardStatus.IN_PROGRESS);
        cardRepository.save(card);

        CardBranch cardBranch = new CardBranch(card, branchName, repoName);
        cardBranchRepository.save(cardBranch);

        List<Map<String, Object>> commits = fetchUniqueCommits(owner, repoName, accessToken, defaultBranch, branchName);
        for (Map<String, Object> commit : commits) {
            saveCommitLog(card, commit);
        }

        log.info("[Sync] 브랜치 동기화 완료. branch={}, 커밋 수={}", branchName, commits.size());
    }

    private String fetchDefaultBranch(String owner, String repoName, String accessToken) {
        try {
            Map<String, Object> repo = restClient.get()
                    .uri("https://api.github.com/repos/{owner}/{repo}", owner, repoName)
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Accept", "application/vnd.github+json")
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});

            if (repo != null && repo.get("default_branch") instanceof String defaultBranch) {
                return defaultBranch;
            }
        } catch (Exception e) {
            log.warn("[Sync] default_branch 조회 실패, 'main'으로 fallback. error={}", e.getMessage());
        }
        return "main";
    }

    private List<String> fetchOpenBranches(String owner, String repoName, String accessToken, String defaultBranch) {
        List<Map<String, Object>> response = restClient.get()
                .uri("https://api.github.com/repos/{owner}/{repo}/branches?per_page=100", owner, repoName)
                .header("Authorization", "Bearer " + accessToken)
                .header("Accept", "application/vnd.github+json")
                .retrieve()
                .body(new ParameterizedTypeReference<>() {});

        if (response == null) return List.of();

        return response.stream()
                .map(b -> (String) b.get("name"))
                .filter(name -> name != null && !name.equals(defaultBranch))
                .limit(MAX_BRANCHES)
                .toList();
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> fetchUniqueCommits(String owner, String repoName,
                                                          String accessToken, String base, String head) {
        try {
            Map<String, Object> response = restClient.get()
                    .uri("https://api.github.com/repos/{owner}/{repo}/compare/{base}...{head}",
                            owner, repoName, base, head)
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Accept", "application/vnd.github+json")
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});

            if (response == null || !(response.get("commits") instanceof List)) return List.of();

            List<Map<String, Object>> commits = (List<Map<String, Object>>) response.get("commits");
            // 최신 커밋부터 MAX_COMMITS_PER_BRANCH개 (compare는 오래된 순 반환)
            int from = Math.max(0, commits.size() - MAX_COMMITS_PER_BRANCH);
            return commits.subList(from, commits.size()).reversed();
        } catch (Exception e) {
            log.warn("[Sync] 커밋 비교 조회 실패. head={}, error={}", head, e.getMessage());
            return List.of();
        }
    }

    @SuppressWarnings("unchecked")
    private void saveCommitLog(Card card, Map<String, Object> commitData) {
        String sha = (String) commitData.get("sha");
        if (sha == null || commitLogRepository.existsByCommitSha(sha)) return;

        Map<String, Object> commitDetail = (Map<String, Object>) commitData.get("commit");
        if (commitDetail == null) return;

        String message = (String) commitDetail.get("message");
        Map<String, Object> authorInfo = (Map<String, Object>) commitDetail.get("author");
        String author = authorInfo != null ? (String) authorInfo.get("name") : null;
        String dateStr = authorInfo != null ? (String) authorInfo.get("date") : null;

        LocalDateTime committedAt = parseTimestamp(dateStr);

        CommitLog commitLog = CommitLog.builder()
                .card(card)
                .commitSha(sha)
                .message(message)
                .author(author)
                .committedAt(committedAt)
                .build();
        commitLogRepository.save(commitLog);
    }

    private LocalDateTime parseTimestamp(String timestamp) {
        try {
            return LocalDateTime.parse(timestamp, DateTimeFormatter.ISO_OFFSET_DATE_TIME);
        } catch (Exception e) {
            return LocalDateTime.now();
        }
    }
}