package com.capstone.gitmanager.board.repository;

import com.capstone.gitmanager.board.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    @Query("SELECT c FROM Comment c JOIN FETCH c.user WHERE c.card.id = :cardId")
    List<Comment> findAllByCardId(@Param("cardId") Long cardId);

    @Query("SELECT c.card.id, COUNT(c) FROM Comment c WHERE c.card.id IN :cardIds GROUP BY c.card.id")
    List<Object[]> countByCardIds(@Param("cardIds") List<Long> cardIds);
}