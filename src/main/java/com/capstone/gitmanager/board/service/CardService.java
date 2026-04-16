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

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CardService {

    private final CardRepository cardRepository;
    private final CardAssigneeRepository cardAssigneeRepository;
    private final CommitLogRepository commitLogRepository;
    private final UserRepository userRepository;
    private final UserProjectRepository userProjectRepository;

    public BoardResponse getBoard(Long projectId, Long userId) {
        validateProjectMember(projectId, userId);
        List<Card> cards = cardRepository.findAllByProjectId(projectId);

        List<CardSummaryResponse> backlog = cards.stream()
                .filter(c -> c.getStatus() == CardStatus.BACKLOG)
                .map(CardSummaryResponse::from)
                .toList();

        List<CardSummaryResponse> inProgress = cards.stream()
                .filter(c -> c.getStatus() == CardStatus.IN_PROGRESS)
                .map(CardSummaryResponse::from)
                .toList();

        List<CardSummaryResponse> done = cards.stream()
                .filter(c -> c.getStatus() == CardStatus.DONE)
                .map(CardSummaryResponse::from)
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

    private void saveAssignees(Card card, List<Long> assigneeIds) {
        if (assigneeIds == null || assigneeIds.isEmpty()) return;

        List<User> users = userRepository.findAllById(assigneeIds);
        users.forEach(user -> {
            CardAssignee assignee = new CardAssignee(card, user);
            cardAssigneeRepository.save(assignee);
            card.getAssignees().add(assignee);
        });
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