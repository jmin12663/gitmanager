package com.capstone.gitmanager.todo.dto;

import com.capstone.gitmanager.todo.entity.Todo;

import java.time.LocalDateTime;

public record TodoResponse(
        Long id,
        String content,
        boolean isDone,
        LocalDateTime createdAt
) {
    public static TodoResponse from(Todo todo) {
        return new TodoResponse(
                todo.getId(),
                todo.getContent(),
                todo.isDone(),
                todo.getCreatedAt()
        );
    }
}
