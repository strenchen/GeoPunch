package com.attendance.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "leave_request", indexes = {
    @Index(name = "idx_employee_leave", columnList = "employee_id, created_at"),
    @Index(name = "idx_status", columnList = "status"),
    @Index(name = "idx_leave_type", columnList = "leave_type")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LeaveRequest {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "employee_id", nullable = false)
    private Long employeeId;
    
    @Column(name = "leave_type", nullable = false, length = 30)
    private String leaveType;  // ANNUAL, SICK, PERSONAL, MATERNITY, PATERNITY, UNPAID
    
    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;
    
    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;
    
    @Column(nullable = false)
    private Double days;  // 请假天数
    
    @Column(nullable = false, length = 500)
    private String reason;
    
    @Column(length = 500)
    private String attachment;
    
    @Column(nullable = false, length = 20)
    private String status;  // PENDING, APPROVED, REJECTED, CANCELLED
    
    @Column(name = "approver_id")
    private Long approverId;
    
    @Column(name = "approved_at")
    private LocalDateTime approvedAt;
    
    @Column(name = "approval_comment", length = 500)
    private String approvalComment;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
