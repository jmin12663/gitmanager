package com.capstone.gitmanager.project.entity;

import com.capstone.gitmanager.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

import static lombok.AccessLevel.PROTECTED;

@Entity
@Table(name = "projects")
@Getter
@NoArgsConstructor(access = PROTECTED)
public class Project extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String description;

    private LocalDate startDate;

    private LocalDate endDate;

    @Column(nullable = false)
    private Long createdBy;

    @Column(nullable = false, unique = true, length = 6)
    private String inviteCode;

    @Builder
    private Project(String name, String description, LocalDate startDate, LocalDate endDate,
                    Long createdBy, String inviteCode) {
        this.name = name;
        this.description = description;
        this.startDate = startDate;
        this.endDate = endDate;
        this.createdBy = createdBy;
        this.inviteCode = inviteCode;
    }

    public void update(String name, String description, LocalDate startDate, LocalDate endDate) {
        this.name = name;
        this.description = description;
        this.startDate = startDate;
        this.endDate = endDate;
    }

    public void regenerateInviteCode(String newCode) {
        this.inviteCode = newCode;
    }
}