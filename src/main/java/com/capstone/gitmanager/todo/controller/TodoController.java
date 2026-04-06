package com.capstone.gitmanager.todo.controller;

import com.capstone.gitmanager.common.dto.ApiResponse;
import com.capstone.gitmanager.todo.dto.TodoCreateRequest;
import com.capstone.gitmanager.todo.dto.TodoResponse;
import com.capstone.gitmanager.todo.service.TodoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/todos")
@RequiredArgsConstructor
public class TodoController {

    private final TodoService todoService;

    @GetMapping
    public ApiResponse<List<TodoResponse>> getMyTodos(@AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(todoService.getMyTodos(userId));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<TodoResponse> createTodo(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody TodoCreateRequest request) {
        return ApiResponse.ok(todoService.createTodo(userId, request));
    }

    @PatchMapping("/{todoId}/toggle")
    public ApiResponse<TodoResponse> toggleTodo(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long todoId) {
        return ApiResponse.ok(todoService.toggleTodo(userId, todoId));
    }

    @DeleteMapping("/{todoId}")
    public ApiResponse<Void> deleteTodo(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long todoId) {
        todoService.deleteTodo(userId, todoId);
        return ApiResponse.ok();
    }
}
