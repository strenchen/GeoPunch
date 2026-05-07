package com.attendance.repository;

import com.attendance.entity.AttendanceRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, Long> {
    
    Optional<AttendanceRecord> findByEmployeeIdAndWorkDate(Long employeeId, LocalDate workDate);
    
    List<AttendanceRecord> findByEmployeeIdAndWorkDateBetween(Long employeeId, LocalDate startDate, LocalDate endDate);
    
    List<AttendanceRecord> findByWorkDate(LocalDate workDate);
    
    List<AttendanceRecord> findByEmployeeIdAndStatus(Long employeeId, String status);
    
    @Query("SELECT COUNT(a) FROM AttendanceRecord a WHERE a.employeeId = :employeeId " +
           "AND a.workDate BETWEEN :startDate AND :endDate AND a.status = :status")
    Long countByEmployeeIdAndDateRangeAndStatus(
            @Param("employeeId") Long employeeId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("status") String status);
    
    @Query("SELECT a FROM AttendanceRecord a WHERE a.employeeId = :employeeId " +
           "AND YEAR(a.workDate) = :year AND MONTH(a.workDate) = :month")
    List<AttendanceRecord> findByEmployeeIdAndYearAndMonth(
            @Param("employeeId") Long employeeId,
            @Param("year") int year,
            @Param("month") int month);
}
