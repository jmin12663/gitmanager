package com.capstone.gitmanager.board.entity;

import jakarta.persistence.*;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

import static lombok.AccessLevel.PROTECTED;

@Entity
@Table(name = "commit_logs")
@Getter
@NoArgsConstructor(access = PROTECTED)
public class CommitLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "card_id", nullable = false)
    private Card card;

    @Column(nullable = false, unique = true)
    private String commitSha;

    @Column(columnDefinition = "TEXT")
    private String message;

    private String author;

    private LocalDateTime committedAt;

    @Builder
    private CommitLog(Card card, String commitSha, String message, String author, LocalDateTime committedAt) {
        this.card = card;
        this.commitSha = commitSha;
        this.message = message;
        this.author = author;
        this.committedAt = committedAt;
    }
}