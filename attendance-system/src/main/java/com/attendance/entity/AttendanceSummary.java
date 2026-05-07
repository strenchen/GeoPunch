package com.attendance.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "attendance_summary", indexes = {
    @Index(name = "idx_employee_month", columnList = "employee_id, year, month"),
    @Index(name = "idx_year_month", columnList = "year, month")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceSummary {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "employee_id", nullable = false)
    private Long employeeId;
    
    @Column(nullable = false)
    private Integer year;
    
    @Column(nullable = false)
    private Integer month;
    
    @Column(name = "total_work_days")
    private Integer totalWorkDays;  // 应出勤天数
    
    @Column(name = "actual_work_days")
    private Integer actualWorkDays;  // 实际出勤天数
    
    @Column(name = "late_days")
    private Integer lateDays;  // 迟到次数
    
    @Column(name = "early_leave_days")
    private Integer earlyLeaveDays;  // 早退次数
    
    @Column(name = "absent_days")
    private Integer absentDays;  // 旷工天数
    
    @Column(name = "overtime_hours", precision = 5, scale = 2)
    private Double overtimeHours;  // 加班小时数
    
    @Column(name = "leave_days")
    private Double leaveDays;  // 请假天数
    
    @Column(name = "normal_days")
    private Integer normalDays;  // 正常天数
    
    @Column(name = "calculated_at")
    private LocalDateTime calculatedAt;
    
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
