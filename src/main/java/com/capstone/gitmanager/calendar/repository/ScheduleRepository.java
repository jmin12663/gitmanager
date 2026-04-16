package com.capstone.gitmanager.calendar.repository;

import com.capstone.gitmanager.calendar.entity.Schedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface ScheduleRepository extends JpaRepository<Schedule, Long> {

    @Query("SELECT s FROM Schedule s WHERE s.projectId = :projectId " +
           "AND s.startDate <= :to AND s.endDate >= :from")
    List<Schedule> findAllByProjectIdAndPeriod(
            @Param("projectId") Long projectId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to
    );
}