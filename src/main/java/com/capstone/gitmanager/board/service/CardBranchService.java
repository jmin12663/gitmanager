package com.capstone.gitmanager.board.service;

import com.capstone.gitmanager.board.dto.BranchResponse;
import com.capstone.gitmanager.board.dto.CardBranchRequest;
import com.capstone.gitmanager.board.entity.Card;
import com.capstone.gitmanager.board.entity.CardBranch;
import com.capstone.gitmanager.board.entity.CardBranchId;
import com.capstone.gitmanager.board.repository.CardBranchRepository;
import com.capstone.gitmanager.board.repository.CardRepository;
import com.capstone.gitmanager.common.exception.CustomException;
import com.capstone.gitmanager.common.exception.ErrorCode;
import com.capstone.gitmanager.project.entity.UserProjectId;
import com.capstone.gitmanager.project.repository.UserProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CardBranchService {

    private final CardRepository cardRepository;
    private final CardBranchRepository cardBranchRepository;
    private final UserProjectRepository userProjectRepository;

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