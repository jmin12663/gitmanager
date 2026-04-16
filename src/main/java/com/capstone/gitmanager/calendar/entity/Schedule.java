package com.capstone.gitmanager.calendar.entity;

import com.capstone.gitmanager.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

import static lombok.AccessLevel.PROTECTED;

@Entity
@Table(name = "schedules")
@Getter
@NoArgsConstructor(access = PROTECTED)
public class Schedule extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long projectId;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private LocalDate startDate;

    @Column(nullable = false)
    private LocalDate endDate;

    @Column(nullable = false)
    private Long createdBy;

    @Builder
    private Schedule(Long projectId, String title, LocalDate startDate, LocalDate endDate, Long createdBy) {
        this.projectId = projectId;
        this.title = title;
        this.startDate = startDate;
        this.endDate = endDate;
        this.createdBy = createdBy;
    }

    public void update(String title, LocalDate startDate, LocalDate endDate) {
        this.title = title;
        this.startDate = startDate;
        this.endDate = endDate;
    }
}