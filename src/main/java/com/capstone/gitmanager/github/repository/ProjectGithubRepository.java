package com.capstone.gitmanager.github.repository;

import com.capstone.gitmanager.github.entity.ProjectGithub;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProjectGithubRepository extends JpaRepository<ProjectGithub, Long> {

    Optional<ProjectGithub> findByRepoName(String repoName);
}
