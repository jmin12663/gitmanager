package com.capstone.gitmanager.todo.repository;

import com.capstone.gitmanager.auth.entity.User;
import com.capstone.gitmanager.todo.entity.Todo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TodoRepository extends JpaRepository<Todo, Long> {

    List<Todo> findByUserOrderByCreatedAtDesc(User user);
}
