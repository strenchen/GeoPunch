package com.attendance.repository;

import com.attendance.entity.LeaveRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, Long> {
    
    List<LeaveRequest> findByEmployeeIdOrderByCreatedAtDesc(Long employeeId);
    
    List<LeaveRequest> findByStatus(String status);
    
    List<LeaveRequest> findByEmployeeIdAndStatus(Long employeeId, String status);
    
    @Query("SELECT l FROM LeaveRequest l WHERE l.employeeId = :employeeId " +
           "AND l.status = 'APPROVED' AND l.startDate <= :endDate AND l.endDate >= :startDate")
    List<LeaveRequest> findApprovedLeaveInDateRange(
            @Param("employeeId") Long employeeId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);
}
