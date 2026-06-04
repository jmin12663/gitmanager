package com.capstone.gitmanager.board.repository;

import com.capstone.gitmanager.board.entity.CardAssignee;
import com.capstone.gitmanager.board.entity.CardAssigneeId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CardAssigneeRepository extends JpaRepository<CardAssignee, CardAssigneeId> {

    @Modifying
    @Query(value = "DELETE FROM card_assignees WHERE card_id IN (SELECT id FROM cards WHERE project_id = :projectId)", nativeQuery = true)
    void deleteAllByProjectId(@Param("projectId") Long projectId);
}