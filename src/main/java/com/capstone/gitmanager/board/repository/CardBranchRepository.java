package com.capstone.gitmanager.board.repository;

import com.capstone.gitmanager.board.entity.CardBranch;
import com.capstone.gitmanager.board.entity.CardBranchId;
import com.capstone.gitmanager.board.entity.CardStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface CardBranchRepository extends JpaRepository<CardBranch, CardBranchId> {

    List<CardBranch> findAllByCardId(Long cardId);

    Optional<CardBranch> findFirstByRepoNameAndIdBranchName(String repoName, String branchName);

    @Query("SELECT cb.id.branchName FROM CardBranch cb JOIN cb.card c WHERE c.projectId = :projectId AND c.status = :status")
    Set<String> findBranchNamesByProjectIdAndCardStatus(@Param("projectId") Long projectId, @Param("status") CardStatus status);

    @Modifying
    @Query(value = "DELETE FROM card_branch WHERE card_id IN (SELECT id FROM cards WHERE project_id = :projectId)", nativeQuery = true)
    void deleteAllByProjectId(@Param("projectId") Long projectId);
}