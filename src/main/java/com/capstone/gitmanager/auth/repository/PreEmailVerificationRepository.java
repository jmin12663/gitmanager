package com.capstone.gitmanager.auth.repository;

import com.capstone.gitmanager.auth.entity.PreEmailVerification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PreEmailVerificationRepository extends JpaRepository<PreEmailVerification, Long> {
    Optional<PreEmailVerification> findByEmail(String email);
    void deleteByEmail(String email);
}