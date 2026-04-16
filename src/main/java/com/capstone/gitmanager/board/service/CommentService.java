package com.capstone.gitmanager.board.service;

import com.capstone.gitmanager.auth.entity.User;
import com.capstone.gitmanager.auth.repository.UserRepository;
import com.capstone.gitmanager.board.dto.CommentCreateRequest;
import com.capstone.gitmanager.board.dto.CommentResponse;
import com.capstone.gitmanager.board.entity.Card;
import com.capstone.gitmanager.board.entity.Comment;
import com.capstone.gitmanager.board.repository.CardRepository;
import com.capstone.gitmanager.board.repository.CommentRepository;
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
public class CommentService {

    private final CommentRepository commentRepository;
    private final CardRepository cardRepository;
    private final UserRepository userRepository;
    private final UserProjectRepository userProjectRepository;

    public List<CommentResponse> getComments(Long projectId, Long cardId, Long userId) {
        validateProjectMember(projectId, userId);
        findCardInProject(projectId, cardId);
        return commentRepository.findAllByCardId(cardId)
                .stream().map(CommentResponse::from).toList();
    }

    @Transactional
    public CommentResponse createComment(Long projectId, Long cardId, Long userId, CommentCreateRequest request) {
        validateProjectMember(projectId, userId);
        Card card = findCardInProject(projectId, cardId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        Comment comment = Comment.builder()
                .card(card)
                .user(user)
                .content(request.content())
                .build();
        commentRepository.save(comment);

        return CommentResponse.from(comment);
    }

    @Transactional
    public void deleteComment(Long projectId, Long cardId, Long commentId, Long userId) {
        validateProjectMember(projectId, userId);
        findCardInProject(projectId, cardId);
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new CustomException(ErrorCode.COMMENT_NOT_FOUND));

        if (!comment.getCard().getId().equals(cardId)) {
            throw new CustomException(ErrorCode.COMMENT_NOT_FOUND);
        }

        if (!comment.getUser().getId().equals(userId)) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }

        comment.delete();
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