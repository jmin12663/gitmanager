package com.capstone.gitmanager.board.repository;

import com.capstone.gitmanager.board.entity.Card;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CardRepository extends JpaRepository<Card, Long> {

    @EntityGraph(attributePaths = {"assignees", "assignees.user", "branches"})
    List<Card> findAllByProjectId(Long projectId);
}