package com.capstone.gitmanager.board.repository;

import com.capstone.gitmanager.board.entity.CardBranch;
import com.capstone.gitmanager.board.entity.CardBranchId;
import com.capstone.gitmanager.board.entity.CardStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface CardBranchRepository extends JpaRepository<CardBranch, CardBranchId> {

    List<CardBranch> findAllByCardId(Long cardId);

    Optional<CardBranch> findByRepoNameAndIdBranchName(String repoName, String branchName);

    @Query("SELECT cb.id.branchName FROM CardBranch cb JOIN Card c ON cb.cardId = c.id WHERE c.projectId = :projectId AND c.status = :status")
    Set<String> findBranchNamesByProjectIdAndCardStatus(@Param("projectId") Long projectId, @Param("status") CardStatus status);
}