package com.capstone.gitmanager.board.repository;

import com.capstone.gitmanager.board.entity.Card;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CardRepository extends JpaRepository<Card, Long> {

    @EntityGraph(attributePaths = {"assignees", "assignees.user", "branches"})
    List<Card> findAllByProjectId(Long projectId);

    Optional<Card> findByLinkedScheduleId(Long linkedScheduleId);

    @Modifying
    @Query(value = "DELETE FROM cards WHERE project_id = :projectId", nativeQuery = true)
    void deleteAllByProjectId(@Param("projectId") Long projectId);
}