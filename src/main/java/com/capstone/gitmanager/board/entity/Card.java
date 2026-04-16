package com.capstone.gitmanager.board.entity;

import com.capstone.gitmanager.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static lombok.AccessLevel.PROTECTED;

@Entity
@Table(name = "cards")
@Getter
@NoArgsConstructor(access = PROTECTED)
@SQLRestriction("is_deleted = false")
public class Card extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long projectId;

    @Column(nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CardStatus status = CardStatus.BACKLOG;

    private LocalDate dueDate;

    @Column(columnDefinition = "TEXT")
    private String memo;

    @Column(nullable = false)
    private boolean isDeleted = false;

    @Column(nullable = false)
    private Long createdBy;

    private LocalDateTime mergedAt;

    @OneToMany(mappedBy = "card", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CardAssignee> assignees = new ArrayList<>();

    @OneToMany(mappedBy = "card", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CardBranch> branches = new ArrayList<>();

    @Builder
    private Card(Long projectId, String title, LocalDate dueDate, String memo, Long createdBy) {
        this.projectId = projectId;
        this.title = title;
        this.dueDate = dueDate;
        this.memo = memo;
        this.createdBy = createdBy;
    }

    public void update(String title, LocalDate dueDate, String memo) {
        this.title = title;
        this.dueDate = dueDate;
        this.memo = memo;
    }

    public void changeStatus(CardStatus status) {
        this.status = status;
    }

    public void markMerged(LocalDateTime mergedAt) {
        this.status = CardStatus.DONE;
        this.mergedAt = mergedAt;
    }

    public void delete() {
        this.isDeleted = true;
    }
}