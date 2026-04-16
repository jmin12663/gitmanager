package com.capstone.gitmanager.board.dto;

import com.capstone.gitmanager.board.entity.CardBranch;

public record BranchResponse(
        String branchName,
        String repoName
) {
    public static BranchResponse from(CardBranch branch) {
        return new BranchResponse(branch.getBranchName(), branch.getRepoName());
    }
}