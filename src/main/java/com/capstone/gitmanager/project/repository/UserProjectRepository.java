package com.capstone.gitmanager.project.repository;

import com.capstone.gitmanager.auth.entity.User;
import com.capstone.gitmanager.project.entity.Project;
import com.capstone.gitmanager.project.entity.UserProject;
import com.capstone.gitmanager.project.entity.UserProjectId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserProjectRepository extends JpaRepository<UserProject, UserProjectId> {

    List<UserProject> findByUser(User user);

    List<UserProject> findByProject(Project project);

    Optional<UserProject> findByUserAndProject(User user, Project project);

    boolean existsByUserAndProject(User user, Project project);

    @Query("SELECT up FROM UserProject up JOIN FETCH up.user WHERE up.project = :project")
    List<UserProject> findByProjectWithUser(@Param("project") Project project);
}