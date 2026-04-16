package com.capstone.gitmanager.board.repository;

import com.capstone.gitmanager.board.entity.CardBranch;
import com.capstone.gitmanager.board.entity.CardBranchId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CardBranchRepository extends JpaRepository<CardBranch, CardBranchId> {

    List<CardBranch> findAllByCardId(Long cardId);

    Optional<CardBranch> findByRepoNameAndIdBranchName(String repoName, String branchName);
}