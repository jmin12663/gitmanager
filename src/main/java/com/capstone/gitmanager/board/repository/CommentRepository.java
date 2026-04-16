package com.capstone.gitmanager.board.repository;

import com.capstone.gitmanager.board.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    List<Comment> findAllByCardId(Long cardId);
}