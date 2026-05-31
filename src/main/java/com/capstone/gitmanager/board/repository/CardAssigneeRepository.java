package com.capstone.gitmanager.board.repository;

import com.capstone.gitmanager.board.entity.CardAssignee;
import com.capstone.gitmanager.board.entity.CardAssigneeId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CardAssigneeRepository extends JpaRepository<CardAssignee, CardAssigneeId> {
}