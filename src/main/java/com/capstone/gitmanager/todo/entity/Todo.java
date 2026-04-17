package com.capstone.gitmanager.todo.entity;

import com.capstone.gitmanager.auth.entity.User;
import com.capstone.gitmanager.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import static lombok.AccessLevel.PROTECTED;

@Entity
@Table(name = "todos")
@Getter
@NoArgsConstructor(access = PROTECTED)
public class Todo extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String content;

    @Column(nullable = false)
    private boolean isDone = false;

    @Builder
    private Todo(User user, String content) {
        this.user = user;
        this.content = content;
    }

    public void toggleDone() {
        this.isDone = !this.isDone;
    }
}
