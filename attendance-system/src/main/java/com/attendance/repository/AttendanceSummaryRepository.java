package com.attendance.repository;

import com.attendance.entity.AttendanceSummary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AttendanceSummaryRepository extends JpaRepository<AttendanceSummary, Long> {
    
    Optional<AttendanceSummary> findByEmployeeIdAndYearAndMonth(Long employeeId, int year, int month);
    
    @Query("SELECT s FROM AttendanceSummary s WHERE s.employeeId = :employeeId AND s.year = :year AND s.month = :month")
    Optional<AttendanceSummary> findExistingSummary(
            @Param("employeeId") Long employeeId,
            @Param("year") int year,
            @Param("month") int month);
}
