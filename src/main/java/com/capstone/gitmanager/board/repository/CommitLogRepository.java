package com.capstone.gitmanager.board.repository;

import com.capstone.gitmanager.board.entity.CommitLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CommitLogRepository extends JpaRepository<CommitLog, Long> {

    List<CommitLog> findAllByCardId(Long cardId);

    boolean existsByCommitSha(String commitSha);

    @Query("SELECT cl FROM CommitLog cl JOIN FETCH cl.card WHERE cl.card.projectId = :projectId ORDER BY cl.committedAt DESC LIMIT 10")
    List<CommitLog> findTop10WithCardByProjectId(@Param("projectId") Long projectId);
}