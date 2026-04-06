package com.capstone.gitmanager.todo.service;

import com.capstone.gitmanager.auth.entity.User;
import com.capstone.gitmanager.auth.repository.UserRepository;
import com.capstone.gitmanager.common.exception.CustomException;
import com.capstone.gitmanager.common.exception.ErrorCode;
import com.capstone.gitmanager.todo.dto.TodoCreateRequest;
import com.capstone.gitmanager.todo.dto.TodoResponse;
import com.capstone.gitmanager.todo.entity.Todo;
import com.capstone.gitmanager.todo.repository.TodoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TodoService {

    private final TodoRepository todoRepository;
    private final UserRepository userRepository;

    public List<TodoResponse> getMyTodos(Long userId) {
        User user = getUser(userId);
        return todoRepository.findByUserOrderByCreatedAtDesc(user).stream()
                .map(TodoResponse::from)
                .toList();
    }

    @Transactional
    public TodoResponse createTodo(Long userId, TodoCreateRequest request) {
        User user = getUser(userId);
        Todo todo = Todo.builder()
                .user(user)
                .content(request.content())
                .build();
        return TodoResponse.from(todoRepository.save(todo));
    }

    @Transactional
    public TodoResponse toggleTodo(Long userId, Long todoId) {
        Todo todo = getTodoOrThrow(todoId);
        requireOwner(userId, todo);
        todo.toggleDone();
        return TodoResponse.from(todo);
    }

    @Transactional
    public void deleteTodo(Long userId, Long todoId) {
        Todo todo = getTodoOrThrow(todoId);
        requireOwner(userId, todo);
        todoRepository.delete(todo);
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }

    private Todo getTodoOrThrow(Long todoId) {
        return todoRepository.findById(todoId)
                .orElseThrow(() -> new CustomException(ErrorCode.TODO_NOT_FOUND));
    }

    private void requireOwner(Long userId, Todo todo) {
        if (!todo.getUser().getId().equals(userId)) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }
    }
}
