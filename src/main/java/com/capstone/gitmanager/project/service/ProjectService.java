package com.capstone.gitmanager.project.service;

import com.capstone.gitmanager.auth.entity.User;
import com.capstone.gitmanager.auth.repository.UserRepository;
import com.capstone.gitmanager.common.exception.CustomException;
import com.capstone.gitmanager.common.exception.ErrorCode;
import com.capstone.gitmanager.project.dto.*;
import com.capstone.gitmanager.project.entity.Project;
import com.capstone.gitmanager.project.entity.ProjectRole;
import com.capstone.gitmanager.project.entity.UserProject;
import com.capstone.gitmanager.project.repository.ProjectRepository;
import com.capstone.gitmanager.project.repository.UserProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProjectService {

    private static final String INVITE_CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final int INVITE_CODE_LENGTH = 6;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final ProjectRepository projectRepository;
    private final UserProjectRepository userProjectRepository;
    private final UserRepository userRepository;

    @Transactional
    public ProjectResponse createProject(Long userId, ProjectCreateRequest request) {
        User user = getUser(userId);
        String inviteCode = generateUniqueInviteCode();

        Project project = Project.builder()
                .name(request.name())
                .description(request.description())
                .startDate(request.startDate())
                .endDate(request.endDate())
                .createdBy(userId)
                .inviteCode(inviteCode)
                .build();
        projectRepository.save(project);

        UserProject userProject = UserProject.builder()
                .user(user)
                .project(project)
                .role(ProjectRole.OWNER)
                .build();
        userProjectRepository.save(userProject);

        return ProjectResponse.from(project, ProjectRole.OWNER);
    }

    public List<ProjectResponse> getMyProjects(Long userId) {
        User user = getUser(userId);
        return userProjectRepository.findByUserWithProject(user).stream()
                .map(up -> ProjectResponse.from(up.getProject(), up.getRole()))
                .toList();
    }

    public ProjectResponse getProject(Long userId, Long projectId) {
        User user = getUser(userId);
        Project project = getProjectOrThrow(projectId);
        UserProject up = getUserProjectOrThrow(user, project);
        return ProjectResponse.from(project, up.getRole());
    }

    @Transactional
    public ProjectResponse updateProject(Long userId, Long projectId, ProjectUpdateRequest request) {
        User user = getUser(userId);
        Project project = getProjectOrThrow(projectId);
        requireOwner(user, project);

        project.update(request.name(), request.description(), request.startDate(), request.endDate());
        return ProjectResponse.from(project, ProjectRole.OWNER);
    }

    @Transactional
    public void deleteProject(Long userId, Long projectId) {
        User user = getUser(userId);
        Project project = getProjectOrThrow(projectId);
        requireOwner(user, project);

        userProjectRepository.deleteAll(userProjectRepository.findByProject(project));
        projectRepository.delete(project);
    }

    public InviteCodeResponse getInviteCode(Long userId, Long projectId) {
        User user = getUser(userId);
        Project project = getProjectOrThrow(projectId);
        requireOwner(user, project);
        return new InviteCodeResponse(project.getInviteCode());
    }

    @Transactional
    public InviteCodeResponse regenerateInviteCode(Long userId, Long projectId) {
        User user = getUser(userId);
        Project project = getProjectOrThrow(projectId);
        requireOwner(user, project);

        project.regenerateInviteCode(generateUniqueInviteCode());
        return new InviteCodeResponse(project.getInviteCode());
    }

    @Transactional
    public ProjectResponse joinProject(Long userId, JoinProjectRequest request) {
        User user = getUser(userId);
        Project project = projectRepository.findByInviteCode(request.inviteCode())
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_INVITE_CODE));

        if (userProjectRepository.existsByUserAndProject(user, project)) {
            throw new CustomException(ErrorCode.ALREADY_PROJECT_MEMBER);
        }

        UserProject userProject = UserProject.builder()
                .user(user)
                .project(project)
                .role(ProjectRole.MEMBER)
                .build();
        userProjectRepository.save(userProject);

        return ProjectResponse.from(project, ProjectRole.MEMBER);
    }

    public List<ProjectMemberResponse> getMembers(Long userId, Long projectId) {
        User user = getUser(userId);
        Project project = getProjectOrThrow(projectId);
        requireMember(user, project);

        return userProjectRepository.findByProjectWithUser(project).stream()
                .map(ProjectMemberResponse::from)
                .toList();
    }

    @Transactional
    public void kickMember(Long requesterId, Long projectId, Long targetUserId) {
        User requester = getUser(requesterId);
        Project project = getProjectOrThrow(projectId);
        requireOwner(requester, project);

        if (requesterId.equals(targetUserId)) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }

        User target = getUser(targetUserId);
        UserProject targetUp = getUserProjectOrThrow(target, project);
        userProjectRepository.delete(targetUp);
    }

    @Transactional
    public void leaveProject(Long userId, Long projectId, LeaveProjectRequest request) {
        User user = getUser(userId);
        Project project = getProjectOrThrow(projectId);
        UserProject up = getUserProjectOrThrow(user, project);

        if (up.getRole() == ProjectRole.OWNER) {
            List<UserProject> members = userProjectRepository.findByProject(project);
            if (members.size() == 1) {
                // 혼자라면 프로젝트 삭제
                userProjectRepository.delete(up);
                projectRepository.delete(project);
                return;
            }
            // 다른 멤버가 있으면 새 OWNER 지정 필수
            if (request == null || request.newOwnerId() == null) {
                throw new CustomException(ErrorCode.NEW_OWNER_REQUIRED);
            }
            if (request.newOwnerId().equals(userId)) {
                throw new CustomException(ErrorCode.FORBIDDEN);
            }
            User newOwner = getUser(request.newOwnerId());
            UserProject newOwnerUp = getUserProjectOrThrow(newOwner, project);
            newOwnerUp.assignOwner();
        }

        userProjectRepository.delete(up);
    }

    // --- private helpers ---

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }

    private Project getProjectOrThrow(Long projectId) {
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new CustomException(ErrorCode.PROJECT_NOT_FOUND));
    }

    private UserProject getUserProjectOrThrow(User user, Project project) {
        return userProjectRepository.findByUserAndProject(user, project)
                .orElseThrow(() -> new CustomException(ErrorCode.PROJECT_MEMBER_NOT_FOUND));
    }

    private void requireOwner(User user, Project project) {
        UserProject up = getUserProjectOrThrow(user, project);
        if (up.getRole() != ProjectRole.OWNER) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }
    }

    private void requireMember(User user, Project project) {
        if (!userProjectRepository.existsByUserAndProject(user, project)) {
            throw new CustomException(ErrorCode.PROJECT_MEMBER_NOT_FOUND);
        }
    }

    private String generateUniqueInviteCode() {
        String code;
        do {
            code = generateInviteCode();
        } while (projectRepository.existsByInviteCode(code));
        return code;
    }

    private String generateInviteCode() {
        StringBuilder sb = new StringBuilder(INVITE_CODE_LENGTH);
        for (int i = 0; i < INVITE_CODE_LENGTH; i++) {
            sb.append(INVITE_CODE_CHARS.charAt(RANDOM.nextInt(INVITE_CODE_CHARS.length())));
        }
        return sb.toString();
    }
}