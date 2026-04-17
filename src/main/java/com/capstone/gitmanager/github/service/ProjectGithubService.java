package com.capstone.gitmanager.github.service;

import com.capstone.gitmanager.common.exception.CustomException;
import com.capstone.gitmanager.common.exception.ErrorCode;
import com.capstone.gitmanager.github.dto.ProjectGithubRequest;
import com.capstone.gitmanager.github.dto.ProjectGithubResponse;
import com.capstone.gitmanager.github.entity.ProjectGithub;
import com.capstone.gitmanager.github.repository.ProjectGithubRepository;
import com.capstone.gitmanager.project.entity.ProjectRole;
import com.capstone.gitmanager.project.entity.UserProjectId;
import java.util.Optional;
import com.capstone.gitmanager.project.repository.ProjectRepository;
import com.capstone.gitmanager.project.repository.UserProjectRepository;
import lombok.RequiredArgsConstructor;
import org.jasypt.encryption.StringEncryptor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProjectGithubService {

    private final ProjectGithubRepository projectGithubRepository;
    private final ProjectRepository projectRepository;
    private final UserProjectRepository userProjectRepository;
    private final StringEncryptor jasyptStringEncryptor;

    public ProjectGithubResponse getGithubConfig(Long projectId, Long userId) {
        validateMember(projectId, userId);
        ProjectGithub github = projectGithubRepository.findById(projectId)
                .orElseThrow(() -> new CustomException(ErrorCode.GITHUB_NOT_CONFIGURED));
        return ProjectGithubResponse.from(github);
    }

    @Transactional
    public ProjectGithubResponse registerGithubConfig(Long projectId, Long userId, ProjectGithubRequest request) {
        validateOwner(projectId, userId);
        projectRepository.findById(projectId)
                .orElseThrow(() -> new CustomException(ErrorCode.PROJECT_NOT_FOUND));

        String encryptedPat = jasyptStringEncryptor.encrypt(request.pat());

        Optional<ProjectGithub> existing = projectGithubRepository.findById(projectId);
        if (existing.isPresent()) {
            existing.get().update(request.repoUrl(), request.repoName(), encryptedPat, request.webhookSecret());
            return ProjectGithubResponse.from(existing.get());
        }

        ProjectGithub github = ProjectGithub.builder()
                .projectId(projectId)
                .repoUrl(request.repoUrl())
                .repoName(request.repoName())
                .patEncrypted(encryptedPat)
                .webhookSecret(request.webhookSecret())
                .build();
        projectGithubRepository.save(github);
        return ProjectGithubResponse.from(github);
    }

    private void validateOwner(Long projectId, Long userId) {
        UserProjectId id = new UserProjectId(userId, projectId);
        var up = userProjectRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.FORBIDDEN));
        if (up.getRole() != ProjectRole.OWNER) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }
    }

    private void validateMember(Long projectId, Long userId) {
        if (!userProjectRepository.existsById(new UserProjectId(userId, projectId))) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }
    }
}