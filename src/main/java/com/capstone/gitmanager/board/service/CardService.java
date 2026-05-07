package com.capstone.gitmanager.board.service;

import com.capstone.gitmanager.auth.entity.User;
import com.capstone.gitmanager.auth.repository.UserRepository;
import com.capstone.gitmanager.board.dto.*;
import com.capstone.gitmanager.board.entity.*;
import com.capstone.gitmanager.board.repository.*;
import com.capstone.gitmanager.common.exception.CustomException;
import com.capstone.gitmanager.common.exception.ErrorCode;
import com.capstone.gitmanager.project.entity.UserProjectId;
import com.capstone.gitmanager.project.repository.UserProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;


@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CardService {

    private final CardRepository cardRepository;
    private final CardAssigneeRepository cardAssigneeRepository;
    private final CardBranchRepository cardBranchRepository;
    private final CommitLogRepository commitLogRepository;
    private final CommentRepository commentRepository;
    private final UserRepository userRepository;
    private final UserProjectRepository userProjectRepository;

    public BoardResponse getBoard(Long projectId, Long userId) {
        validateProjectMember(projectId, userId);
        List<Card> cards = cardRepository.findAllByProjectId(projectId);

        List<Long> cardIds = cards.stream().map(Card::getId).toList();
        Map<Long, Long> commentCounts = commentRepository.countByCardIds(cardIds).stream()
                .collect(Collectors.toMap(row -> (Long) row[0], row -> (Long) row[1]));

        List<CardSummaryResponse> backlog = cards.stream()
                .filter(c -> c.getStatus() == CardStatus.BACKLOG)
                .map(c -> CardSummaryResponse.from(c, commentCounts.getOrDefault(c.getId(), 0L)))
                .toList();

        List<CardSummaryResponse> inProgress = cards.stream()
                .filter(c -> c.getStatus() == CardStatus.IN_PROGRESS)
                .map(c -> CardSummaryResponse.from(c, commentCounts.getOrDefault(c.getId(), 0L)))
                .toList();

        List<CardSummaryResponse> done = cards.stream()
                .filter(c -> c.getStatus() == CardStatus.DONE)
                .map(c -> CardSummaryResponse.from(c, commentCounts.getOrDefault(c.getId(), 0L)))
                .toList();

        return new BoardResponse(backlog, inProgress, done);
    }

    public CardResponse getCard(Long projectId, Long cardId, Long userId) {
        validateProjectMember(projectId, userId);
        Card card = findCardInProject(projectId, cardId);
        List<CommitLogResponse> commitLogs = commitLogRepository.findAllByCardId(cardId)
                .stream().map(CommitLogResponse::from).toList();
        return CardResponse.from(card, commitLogs);
    }

    @Transactional
    public CardResponse createCard(Long projectId, Long userId, CardCreateRequest request) {
        validateProjectMember(projectId, userId);

        Card card = Card.builder()
                .projectId(projectId)
                .title(request.title())
                .dueDate(request.dueDate())
                .memo(request.memo())
                .createdBy(userId)
                .build();
        cardRepository.save(card);

        saveAssignees(card, request.assigneeIds());

        return CardResponse.from(card, List.of());
    }

    @Transactional
    public CardResponse updateCard(Long projectId, Long userId, Long cardId, CardUpdateRequest request) {
        validateProjectMember(projectId, userId);
        Card card = findCardInProject(projectId, cardId);

        card.update(request.title(), request.dueDate(), request.memo());

        card.getAssignees().clear();
        cardAssigneeRepository.flush();
        saveAssignees(card, request.assigneeIds());

        List<CommitLogResponse> commitLogs = commitLogRepository.findAllByCardId(cardId)
                .stream().map(CommitLogResponse::from).toList();
        return CardResponse.from(card, commitLogs);
    }

    @Transactional
    public void updateCardStatus(Long projectId, Long userId, Long cardId, CardStatusUpdateRequest request) {
        validateProjectMember(projectId, userId);
        Card card = findCardInProject(projectId, cardId);
        card.changeStatus(request.status());
    }

    @Transactional
    public void deleteCard(Long projectId, Long userId, Long cardId) {
        validateProjectMember(projectId, userId);
        Card card = findCardInProject(projectId, cardId);
        card.delete();
    }

    @Transactional
    public BranchResponse addBranch(Long projectId, Long cardId, Long userId, CardBranchRequest request) {
        validateProjectMember(projectId, userId);
        Card card = findCardInProject(projectId, cardId);

        CardBranch branch = new CardBranch(card, request.branchName(), request.repoName());
        cardBranchRepository.save(branch);

        return BranchResponse.from(branch);
    }

    @Transactional
    public void removeBranch(Long projectId, Long cardId, Long userId, String branchName) {
        validateProjectMember(projectId, userId);
        findCardInProject(projectId, cardId);

        CardBranchId id = new CardBranchId(cardId, branchName);
        if (!cardBranchRepository.existsById(id)) {
            throw new CustomException(ErrorCode.BRANCH_NOT_FOUND);
        }
        cardBranchRepository.deleteById(id);
    }

    private void saveAssignees(Card card, List<Long> assigneeIds) {
        if (assigneeIds == null || assigneeIds.isEmpty()) return;

        List<User> users = userRepository.findAllById(assigneeIds);
        users.forEach(user -> card.getAssignees().add(new CardAssignee(card, user)));
    }

    private Card findCardInProject(Long projectId, Long cardId) {
        Card card = cardRepository.findById(cardId)
                .orElseThrow(() -> new CustomException(ErrorCode.CARD_NOT_FOUND));
        if (!card.getProjectId().equals(projectId)) {
            throw new CustomException(ErrorCode.CARD_NOT_FOUND);
        }
        return card;
    }

    private void validateProjectMember(Long projectId, Long userId) {
        if (!userProjectRepository.existsById(new UserProjectId(userId, projectId))) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }
    }
}