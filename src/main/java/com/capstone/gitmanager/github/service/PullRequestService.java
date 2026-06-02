package com.capstone.gitmanager.github.service;

import com.capstone.gitmanager.board.entity.Card;
import com.capstone.gitmanager.board.entity.CardStatus;
import com.capstone.gitmanager.board.repository.CardBranchRepository;
import com.capstone.gitmanager.board.repository.CardRepository;
import com.capstone.gitmanager.common.exception.CustomException;
import com.capstone.gitmanager.common.exception.ErrorCode;
import com.capstone.gitmanager.github.dto.CreatePrCommentRequest;
import com.capstone.gitmanager.github.dto.CreatePrCommentReplyRequest;
import com.capstone.gitmanager.github.dto.CreatePrRequest;
import com.capstone.gitmanager.github.dto.MergePrRequest;
import com.capstone.gitmanager.github.dto.PrLineCommentResponse;
import com.capstone.gitmanager.github.dto.PullFileResponse;
import com.capstone.gitmanager.github.dto.PullRequestResponse;
import com.capstone.gitmanager.github.entity.ProjectGithub;
import com.capstone.gitmanager.github.repository.ProjectGithubRepository;
import com.capstone.gitmanager.project.entity.UserProjectId;
import com.capstone.gitmanager.project.repository.UserProjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jasypt.encryption.StringEncryptor;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PullRequestService {

    private final ProjectGithubRepository projectGithubRepository;
    private final CardRepository cardRepository;
    private final CardBranchRepository cardBranchRepository;
    private final UserProjectRepository userProjectRepository;
    private final StringEncryptor jasyptStringEncryptor;

    private final RestClient restClient = RestClient.create();

    public List<PullRequestResponse> getCardPulls(Long projectId, Long cardId, Long userId) {
        validateMember(projectId, userId);

        ProjectGithub github = projectGithubRepository.findById(projectId)
                .orElseThrow(() -> new CustomException(ErrorCode.GITHUB_NOT_CONFIGURED));

        Card card = cardRepository.findById(cardId)
                .orElseThrow(() -> new CustomException(ErrorCode.CARD_NOT_FOUND));

        if (!card.getProjectId().equals(projectId)) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }

        String accessToken = jasyptStringEncryptor.decrypt(github.getOauthTokenEncrypted());
        String owner = parseRepoOwner(github.getRepoUrl());
        String repoName = github.getRepoName();

        List<PullRequestResponse> result = new ArrayList<>();
        for (var branch : card.getBranches()) {
            String branchName = branch.getBranchName();
            List<Map<String, Object>> prs = fetchPullsForBranch(owner, repoName, branchName, accessToken);
            for (Map<String, Object> pr : prs) {
                int prNumber = ((Number) pr.get("number")).intValue();
                List<Map<String, Object>> reviews = fetchReviews(owner, repoName, prNumber, accessToken);
                result.add(PullRequestResponse.from(pr, reviews));
            }
        }
        return result;
    }

    public List<PullRequestResponse> getProjectPulls(Long projectId, Long userId, String state) {
        validateMember(projectId, userId);

        ProjectGithub github = projectGithubRepository.findById(projectId)
                .orElseThrow(() -> new CustomException(ErrorCode.GITHUB_NOT_CONFIGURED));

        String accessToken = jasyptStringEncryptor.decrypt(github.getOauthTokenEncrypted());
        String owner = parseRepoOwner(github.getRepoUrl());
        String repoName = github.getRepoName();

        String ghState = ("merged".equals(state) || "closed".equals(state)) ? "closed" : "open";
        if ("all".equals(state)) ghState = "all";

        List<Map<String, Object>> prs = fetchPulls(owner, repoName, ghState, accessToken);

        return prs.stream()
                .map(pr -> {
                    int prNumber = ((Number) pr.get("number")).intValue();
                    List<Map<String, Object>> reviews = fetchReviews(owner, repoName, prNumber, accessToken);
                    return PullRequestResponse.from(pr, reviews);
                })
                .filter(pr -> filterByState(pr, state))
                .toList();
    }

    public PrLineCommentResponse createPrComment(Long projectId, int prNumber, CreatePrCommentRequest request, Long userId) {
        validateMember(projectId, userId);

        ProjectGithub github = projectGithubRepository.findById(projectId)
                .orElseThrow(() -> new CustomException(ErrorCode.GITHUB_NOT_CONFIGURED));

        String accessToken = jasyptStringEncryptor.decrypt(github.getOauthTokenEncrypted());
        String owner = parseRepoOwner(github.getRepoUrl());
        String repoName = github.getRepoName();

        Map<String, Object> body = Map.of(
                "body", request.body(),
                "commit_id", request.commitId(),
                "path", request.path(),
                "line", request.line(),
                "side", request.side()
        );

        try {
            Map<String, Object> created = restClient.post()
                    .uri("https://api.github.com/repos/{owner}/{repo}/pulls/{prNumber}/comments",
                            owner, repoName, prNumber)
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Accept", "application/vnd.github+json")
                    .body(body)
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});
            if (created == null) throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR);
            return PrLineCommentResponse.from(created);
        } catch (CustomException e) {
            throw e;
        } catch (Exception e) {
            log.warn("[PR] 라인 코멘트 등록 실패. prNumber={}, path={}, line={}, error={}",
                    prNumber, request.path(), request.line(), e.getMessage());
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    public List<PrLineCommentResponse> getPrLineComments(Long projectId, int prNumber, Long userId) {
        validateMember(projectId, userId);

        ProjectGithub github = projectGithubRepository.findById(projectId)
                .orElseThrow(() -> new CustomException(ErrorCode.GITHUB_NOT_CONFIGURED));

        String accessToken = jasyptStringEncryptor.decrypt(github.getOauthTokenEncrypted());
        String owner = parseRepoOwner(github.getRepoUrl());
        String repoName = github.getRepoName();

        return fetchPrLineComments(owner, repoName, prNumber, accessToken);
    }

    public PrLineCommentResponse createPrCommentReply(Long projectId, int prNumber, long commentId, CreatePrCommentReplyRequest request, Long userId) {
        validateMember(projectId, userId);

        ProjectGithub github = projectGithubRepository.findById(projectId)
                .orElseThrow(() -> new CustomException(ErrorCode.GITHUB_NOT_CONFIGURED));

        String accessToken = jasyptStringEncryptor.decrypt(github.getOauthTokenEncrypted());
        String owner = parseRepoOwner(github.getRepoUrl());
        String repoName = github.getRepoName();

        try {
            Map<String, Object> created = restClient.post()
                    .uri("https://api.github.com/repos/{owner}/{repo}/pulls/{prNumber}/comments/{commentId}/replies",
                            owner, repoName, prNumber, commentId)
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Accept", "application/vnd.github+json")
                    .body(Map.of("body", request.body()))
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});
            if (created == null) throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR);
            return PrLineCommentResponse.from(created);
        } catch (CustomException e) {
            throw e;
        } catch (Exception e) {
            log.warn("[PR] 답글 등록 실패. prNumber={}, commentId={}, error={}", prNumber, commentId, e.getMessage());
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    public List<String> getRepoBranches(Long projectId, Long userId) {
        validateMember(projectId, userId);

        ProjectGithub github = projectGithubRepository.findById(projectId)
                .orElseThrow(() -> new CustomException(ErrorCode.GITHUB_NOT_CONFIGURED));

        String accessToken = jasyptStringEncryptor.decrypt(github.getOauthTokenEncrypted());
        String owner = parseRepoOwner(github.getRepoUrl());
        String repoName = github.getRepoName();

        Set<String> doneBranches = cardBranchRepository.findBranchNamesByProjectIdAndCardStatus(projectId, CardStatus.DONE);

        try {
            List<Map<String, Object>> res = restClient.get()
                    .uri("https://api.github.com/repos/{owner}/{repo}/branches?per_page=100", owner, repoName)
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Accept", "application/vnd.github+json")
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});
            if (res == null) return List.of();
            return res.stream()
                    .map(b -> (String) b.get("name"))
                    .filter(name -> !doneBranches.contains(name))
                    .toList();
        } catch (Exception e) {
            log.warn("[PR] 브랜치 목록 조회 실패. error={}", e.getMessage());
            return List.of();
        }
    }

    public PullRequestResponse createPr(Long projectId, CreatePrRequest request, Long userId) {
        validateMember(projectId, userId);

        ProjectGithub github = projectGithubRepository.findById(projectId)
                .orElseThrow(() -> new CustomException(ErrorCode.GITHUB_NOT_CONFIGURED));

        String accessToken = jasyptStringEncryptor.decrypt(github.getOauthTokenEncrypted());
        String owner = parseRepoOwner(github.getRepoUrl());
        String repoName = github.getRepoName();

        Map<String, Object> body = new HashMap<>();
        body.put("title", request.title());
        body.put("head", request.head());
        body.put("base", request.base());
        if (request.body() != null && !request.body().isBlank()) {
            body.put("body", request.body());
        }

        try {
            Map<String, Object> created = restClient.post()
                    .uri("https://api.github.com/repos/{owner}/{repo}/pulls", owner, repoName)
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Accept", "application/vnd.github+json")
                    .body(body)
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});
            if (created == null) throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR);
            int prNumber = ((Number) created.get("number")).intValue();
            List<Map<String, Object>> reviews = fetchReviews(owner, repoName, prNumber, accessToken);
            return PullRequestResponse.from(created, reviews);
        } catch (CustomException e) {
            throw e;
        } catch (HttpClientErrorException e) {
            log.warn("[PR] PR 생성 실패. head={}, base={}, status={}, error={}",
                    request.head(), request.base(), e.getStatusCode(), e.getMessage());
            throw new CustomException(ErrorCode.GITHUB_API_ERROR);
        } catch (Exception e) {
            log.warn("[PR] PR 생성 실패. head={}, base={}, error={}", request.head(), request.base(), e.getMessage());
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    public void closePr(Long projectId, int prNumber, Long userId) {
        validateMember(projectId, userId);

        ProjectGithub github = projectGithubRepository.findById(projectId)
                .orElseThrow(() -> new CustomException(ErrorCode.GITHUB_NOT_CONFIGURED));

        String accessToken = jasyptStringEncryptor.decrypt(github.getOauthTokenEncrypted());
        String owner = parseRepoOwner(github.getRepoUrl());
        String repoName = github.getRepoName();

        try {
            restClient.patch()
                    .uri("https://api.github.com/repos/{owner}/{repo}/pulls/{prNumber}",
                            owner, repoName, prNumber)
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Accept", "application/vnd.github+json")
                    .body(Map.of("state", "closed"))
                    .retrieve()
                    .toBodilessEntity();
        } catch (CustomException e) {
            throw e;
        } catch (Exception e) {
            log.warn("[PR] PR close 실패. prNumber={}, error={}", prNumber, e.getMessage());
            throw new CustomException(ErrorCode.GITHUB_API_ERROR);
        }
    }

    public void mergePr(Long projectId, int prNumber, MergePrRequest request, Long userId) {
        validateMember(projectId, userId);

        ProjectGithub github = projectGithubRepository.findById(projectId)
                .orElseThrow(() -> new CustomException(ErrorCode.GITHUB_NOT_CONFIGURED));

        String accessToken = jasyptStringEncryptor.decrypt(github.getOauthTokenEncrypted());
        String owner = parseRepoOwner(github.getRepoUrl());
        String repoName = github.getRepoName();

        try {
            restClient.put()
                    .uri("https://api.github.com/repos/{owner}/{repo}/pulls/{prNumber}/merge",
                            owner, repoName, prNumber)
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Accept", "application/vnd.github+json")
                    .body(Map.of("merge_method", request.mergeMethod()))
                    .retrieve()
                    .toBodilessEntity();
        } catch (HttpClientErrorException.UnprocessableEntity e) {
            log.warn("[PR] 머지 충돌. prNumber={}, error={}", prNumber, e.getMessage());
            throw new CustomException(ErrorCode.GITHUB_PR_CONFLICT);
        } catch (CustomException e) {
            throw e;
        } catch (Exception e) {
            log.warn("[PR] 머지 실패. prNumber={}, error={}", prNumber, e.getMessage());
            throw new CustomException(ErrorCode.GITHUB_API_ERROR);
        }
    }

    public List<PullFileResponse> getPullFiles(Long projectId, int prNumber, Long userId) {
        validateMember(projectId, userId);

        ProjectGithub github = projectGithubRepository.findById(projectId)
                .orElseThrow(() -> new CustomException(ErrorCode.GITHUB_NOT_CONFIGURED));

        String accessToken = jasyptStringEncryptor.decrypt(github.getOauthTokenEncrypted());
        String owner = parseRepoOwner(github.getRepoUrl());
        String repoName = github.getRepoName();

        return fetchPullFiles(owner, repoName, prNumber, accessToken);
    }

    private boolean filterByState(PullRequestResponse pr, String state) {
        if (state == null || "all".equals(state)) return true;
        return switch (state) {
            case "open"   -> "OPEN".equals(pr.state());
            case "draft"  -> "DRAFT".equals(pr.state());
            case "merged" -> "MERGED".equals(pr.state());
            case "closed" -> "CLOSED".equals(pr.state());
            default       -> true;
        };
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> fetchPullsForBranch(String owner, String repo, String branch, String token) {
        try {
            String headParam = owner + ":" + branch;
            List<Map<String, Object>> res = restClient.get()
                    .uri("https://api.github.com/repos/{owner}/{repo}/pulls?head={head}&state=all&per_page=10",
                            owner, repo, headParam)
                    .header("Authorization", "Bearer " + token)
                    .header("Accept", "application/vnd.github+json")
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});
            return res != null ? res : List.of();
        } catch (Exception e) {
            log.warn("[PR] 브랜치 PR 조회 실패. branch={}, error={}", branch, e.getMessage());
            return List.of();
        }
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> fetchPulls(String owner, String repo, String state, String token) {
        try {
            List<Map<String, Object>> res = restClient.get()
                    .uri("https://api.github.com/repos/{owner}/{repo}/pulls?state={state}&per_page=50",
                            owner, repo, state)
                    .header("Authorization", "Bearer " + token)
                    .header("Accept", "application/vnd.github+json")
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});
            return res != null ? res : List.of();
        } catch (Exception e) {
            log.warn("[PR] 프로젝트 PR 목록 조회 실패. error={}", e.getMessage());
            return List.of();
        }
    }

    @SuppressWarnings("unchecked")
    private List<PrLineCommentResponse> fetchPrLineComments(String owner, String repo, int prNumber, String token) {
        try {
            List<Map<String, Object>> res = restClient.get()
                    .uri("https://api.github.com/repos/{owner}/{repo}/pulls/{prNumber}/comments?per_page=100",
                            owner, repo, prNumber)
                    .header("Authorization", "Bearer " + token)
                    .header("Accept", "application/vnd.github+json")
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});
            if (res == null) return List.of();
            return res.stream().map(PrLineCommentResponse::from).toList();
        } catch (Exception e) {
            log.warn("[PR] 라인 코멘트 조회 실패. prNumber={}, error={}", prNumber, e.getMessage());
            return List.of();
        }
    }

    @SuppressWarnings("unchecked")
    private List<PullFileResponse> fetchPullFiles(String owner, String repo, int prNumber, String token) {
        try {
            List<Map<String, Object>> res = restClient.get()
                    .uri("https://api.github.com/repos/{owner}/{repo}/pulls/{prNumber}/files?per_page=100",
                            owner, repo, prNumber)
                    .header("Authorization", "Bearer " + token)
                    .header("Accept", "application/vnd.github+json")
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});
            if (res == null) return List.of();
            return res.stream().map(PullFileResponse::from).toList();
        } catch (Exception e) {
            log.warn("[PR] 파일 목록 조회 실패. prNumber={}, error={}", prNumber, e.getMessage());
            return List.of();
        }
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> fetchReviews(String owner, String repo, int prNumber, String token) {
        try {
            List<Map<String, Object>> res = restClient.get()
                    .uri("https://api.github.com/repos/{owner}/{repo}/pulls/{prNumber}/reviews",
                            owner, repo, prNumber)
                    .header("Authorization", "Bearer " + token)
                    .header("Accept", "application/vnd.github+json")
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});
            return res != null ? res : List.of();
        } catch (Exception e) {
            log.warn("[PR] 리뷰 조회 실패. prNumber={}, error={}", prNumber, e.getMessage());
            return List.of();
        }
    }

    private String parseRepoOwner(String repoUrl) {
        String[] parts = repoUrl.replaceAll("/$", "").split("/");
        return parts[parts.length - 2];
    }

    private void validateMember(Long projectId, Long userId) {
        if (!userProjectRepository.existsById(new UserProjectId(userId, projectId))) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }
    }
}
