package com.capstone.gitmanager.board.entity;

import jakarta.persistence.Embeddable;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Embeddable
@Getter
@NoArgsConstructor
@EqualsAndHashCode
public class CardBranchId implements Serializable {

    private Long cardId;
    private String branchName;

    public CardBranchId(Long cardId, String branchName) {
        this.cardId = cardId;
        this.branchName = branchName;
    }
}