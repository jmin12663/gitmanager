package com.capstone.gitmanager.board.entity;

import com.capstone.gitmanager.auth.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import static lombok.AccessLevel.PROTECTED;

@Entity
@Table(name = "card_assignees")
@Getter
@NoArgsConstructor(access = PROTECTED)
public class CardAssignee {

    @EmbeddedId
    private CardAssigneeId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("cardId")
    @JoinColumn(name = "card_id")
    private Card card;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("userId")
    @JoinColumn(name = "user_id")
    private User user;

    public CardAssignee(Card card, User user) {
        this.id = new CardAssigneeId(card.getId(), user.getId());
        this.card = card;
        this.user = user;
    }
}