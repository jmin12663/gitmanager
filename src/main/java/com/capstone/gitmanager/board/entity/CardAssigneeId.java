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
public class CardAssigneeId implements Serializable {

    private Long cardId;
    private Long userId;

    public CardAssigneeId(Long cardId, Long userId) {
        this.cardId = cardId;
        this.userId = userId;
    }
}