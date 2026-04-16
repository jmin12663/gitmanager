package com.capstone.gitmanager.board.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

import static lombok.AccessLevel.PROTECTED;

@Entity
@Table(name = "card_branch")
@Getter
@NoArgsConstructor(access = PROTECTED)
public class CardBranch {

    @EmbeddedId
    private CardBranchId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("cardId")
    @JoinColumn(name = "card_id")
    private Card card;

    @Column(nullable = false)
    private String repoName;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    public CardBranch(Card card, String branchName, String repoName) {
        this.id = new CardBranchId(card.getId(), branchName);
        this.card = card;
        this.repoName = repoName;
        this.createdAt = LocalDateTime.now();
    }

    public String getBranchName() {
        return id.getBranchName();
    }
}