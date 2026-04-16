package com.capstone.gitmanager.dashboard.service;

import com.capstone.gitmanager.board.entity.Card;
import com.capstone.gitmanager.board.entity.CardAssignee;
import com.capstone.gitmanager.board.entity.CardStatus;
import com.capstone.gitmanager.board.repository.CardRepository;
import com.capstone.gitmanager.board.repository.CommitLogRepository;
import com.capstone.gitmanager.common.exception.CustomException;
import com.capstone.gitmanager.common.exception.ErrorCode;
import com.capstone.gitmanager.dashboard.dto.CardStatusSummary;
import com.capstone.gitmanager.dashboard.dto.DashboardResponse;
import com.capstone.gitmanager.dashboard.dto.MemberSummaryResponse;
import com.capstone.gitmanager.dashboard.dto.RecentCommitResponse;
import com.capstone.gitmanager.project.entity.UserProject;
import com.capstone.gitmanager.project.entity.UserProjectId;
import com.capstone.gitmanager.project.repository.UserProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardService {

    private final CardRepository cardRepository;
    private final CommitLogRepository commitLogRepository;
    private final UserProjectRepository userProjectRepository;

    public DashboardResponse getDashboard(Long projectId, Long userId) {
        validateProjectMember(projectId, userId);

        List<Card> cards = cardRepository.findAllByProjectId(projectId);

        CardStatusSummary cardSummary = buildCardSummary(cards);

        List<RecentCommitResponse> recentCommits = commitLogRepository
                .findTop10WithCardByProjectId(projectId)
                .stream().map(RecentCommitResponse::from).toList();

        Map<Long, Long> assignedCountByUser = cards.stream()
                .flatMap(card -> card.getAssignees().stream())
                .collect(Collectors.groupingBy(
                        ca -> ca.getUser().getId(),
                        Collectors.counting()
                ));

        List<UserProject> userProjects = userProjectRepository.findByProjectIdWithUser(projectId);
        List<MemberSummaryResponse> members = userProjects.stream()
                .map(up -> MemberSummaryResponse.of(
                        up,
                        assignedCountByUser.getOrDefault(up.getUser().getId(), 0L).intValue()
                ))
                .toList();

        return new DashboardResponse(cardSummary, recentCommits, members);
    }

    private CardStatusSummary buildCardSummary(List<Card> cards) {
        int backlog = (int) cards.stream().filter(c -> c.getStatus() == CardStatus.BACKLOG).count();
        int inProgress = (int) cards.stream().filter(c -> c.getStatus() == CardStatus.IN_PROGRESS).count();
        int done = (int) cards.stream().filter(c -> c.getStatus() == CardStatus.DONE).count();
        int total = cards.size();
        int progressRate = total == 0 ? 0 : (done * 100 / total);

        return new CardStatusSummary(backlog, inProgress, done, total, progressRate);
    }

    private void validateProjectMember(Long projectId, Long userId) {
        if (!userProjectRepository.existsById(new UserProjectId(userId, projectId))) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }
    }
}