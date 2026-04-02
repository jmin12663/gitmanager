package com.capstone.gitmanager.auth.repository;

import com.capstone.gitmanager.auth.entity.RefreshToken;
import com.capstone.gitmanager.auth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    Optional<RefreshToken> findByTokenHash(String tokenHash);
    void deleteByUser(User user);
}