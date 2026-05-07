package com.attendance.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "makeup_request", indexes = {
    @Index(name = "idx_employee_makeup", columnList = "employee_id, created_at"),
    @Index(name = "idx_status_makeup", columnList = "status")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MakeupRequest {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "employee_id", nullable = false)
    private Long employeeId;
    
    @Column(name = "makeup_date", nullable = false)
    private LocalDate makeupDate;  // 补打卡日期
    
    @Column(name = "original_date", nullable = false)
    private LocalDate originalDate;  // 原本应该打卡的日期
    
    @Column(name = "check_in_time", nullable = false)
    private LocalDateTime checkInTime;
    
    @Column(name = "check_out_time")
    private LocalDateTime checkOutTime;
    
    @Column(nullable = false, length = 500)
    private String reason;
    
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
