package com.capstone.gitmanager.board.repository;

import com.capstone.gitmanager.board.entity.CardAssignee;
import com.capstone.gitmanager.board.entity.CardAssigneeId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CardAssigneeRepository extends JpaRepository<CardAssignee, CardAssigneeId> {

    List<CardAssignee> findAllByCardId(Long cardId);
}