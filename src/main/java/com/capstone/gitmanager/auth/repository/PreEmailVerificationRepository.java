package com.capstone.gitmanager.auth.repository;

import com.capstone.gitmanager.auth.entity.PreEmailVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface PreEmailVerificationRepository extends JpaRepository<PreEmailVerification, Long> {
    Optional<PreEmailVerification> findByEmail(String email);

    @Modifying
    @Query("DELETE FROM PreEmailVerification p WHERE p.email = :email")
    void deleteByEmail(@Param("email") String email);
}