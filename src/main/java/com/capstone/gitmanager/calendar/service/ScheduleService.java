package com.capstone.gitmanager.calendar.service;

import com.capstone.gitmanager.calendar.dto.ScheduleCreateRequest;
import com.capstone.gitmanager.calendar.dto.ScheduleResponse;
import com.capstone.gitmanager.calendar.dto.ScheduleUpdateRequest;
import com.capstone.gitmanager.calendar.entity.Schedule;
import com.capstone.gitmanager.calendar.repository.ScheduleRepository;
import com.capstone.gitmanager.common.exception.CustomException;
import com.capstone.gitmanager.common.exception.ErrorCode;
import com.capstone.gitmanager.project.entity.UserProjectId;
import com.capstone.gitmanager.project.repository.UserProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ScheduleService {

    private final ScheduleRepository scheduleRepository;
    private final UserProjectRepository userProjectRepository;

    public List<ScheduleResponse> getSchedules(Long projectId, Long userId, LocalDate from, LocalDate to) {
        validateProjectMember(projectId, userId);
        return scheduleRepository.findAllByProjectIdAndPeriod(projectId, from, to)
                .stream().map(ScheduleResponse::from).toList();
    }

    @Transactional
    public ScheduleResponse createSchedule(Long projectId, Long userId, ScheduleCreateRequest request) {
        validateProjectMember(projectId, userId);

        Schedule schedule = Schedule.builder()
                .projectId(projectId)
                .title(request.title())
                .startDate(request.startDate())
                .endDate(request.endDate())
                .createdBy(userId)
                .build();
        scheduleRepository.save(schedule);

        return ScheduleResponse.from(schedule);
    }

    @Transactional
    public ScheduleResponse updateSchedule(Long projectId, Long userId, Long scheduleId, ScheduleUpdateRequest request) {
        validateProjectMember(projectId, userId);
        Schedule schedule = findScheduleInProject(projectId, scheduleId);

        schedule.update(request.title(), request.startDate(), request.endDate());

        return ScheduleResponse.from(schedule);
    }

    @Transactional
    public void deleteSchedule(Long projectId, Long userId, Long scheduleId) {
        validateProjectMember(projectId, userId);
        Schedule schedule = findScheduleInProject(projectId, scheduleId);
        scheduleRepository.delete(schedule);
    }

    private Schedule findScheduleInProject(Long projectId, Long scheduleId) {
        Schedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new CustomException(ErrorCode.SCHEDULE_NOT_FOUND));
        if (!schedule.getProjectId().equals(projectId)) {
            throw new CustomException(ErrorCode.SCHEDULE_NOT_FOUND);
        }
        return schedule;
    }

    private void validateProjectMember(Long projectId, Long userId) {
        if (!userProjectRepository.existsById(new UserProjectId(userId, projectId))) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }
    }
}