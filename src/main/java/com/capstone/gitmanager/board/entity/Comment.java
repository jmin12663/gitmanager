package com.capstone.gitmanager.board.entity;

import com.capstone.gitmanager.auth.entity.User;
import com.capstone.gitmanager.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.SQLRestriction;

import static lombok.AccessLevel.PROTECTED;

@Entity
@Table(name = "comments")
@Getter
@NoArgsConstructor(access = PROTECTED)
@SQLRestriction("is_deleted = false")
public class Comment extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "card_id", nullable = false)
    private Card card;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(nullable = false)
    private boolean isDeleted = false;

    @Builder
    private Comment(Card card, User user, String content) {
        this.card = card;
        this.user = user;
        this.content = content;
    }

    public void delete() {
        this.isDeleted = true;
    }
}