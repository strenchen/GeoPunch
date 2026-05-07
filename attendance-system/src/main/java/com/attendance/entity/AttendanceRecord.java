package com.attendance.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "attendance_record", indexes = {
    @Index(name = "idx_employee_date", columnList = "employee_id, work_date"),
    @Index(name = "idx_work_date", columnList = "work_date"),
    @Index(name = "idx_status", columnList = "status")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceRecord {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "employee_id", nullable = false)
    private Long employeeId;
    
    @Column(name = "work_date", nullable = false)
    private LocalDate workDate;
    
    @Column(name = "check_in_time")
    private LocalDateTime checkInTime;
    
    @Column(name = "check_out_time")
    private LocalDateTime checkOutTime;
    
    @Column(name = "check_in_lat", precision = 10, scale = 7)
    private Double checkInLat;
    
    @Column(name = "check_in_lng", precision = 10, scale = 7)
    private Double checkInLng;
    
    @Column(name = "check_in_address", length = 500)
    private String checkInAddress;
    
    @Column(name = "check_out_lat", precision = 10, scale = 7)
    private Double checkOutLat;
    
    @Column(name = "check_out_lng", precision = 10, scale = 7)
    private Double checkOutLng;
    
    @Column(name = "check_out_address", length = 500)
    private String checkOutAddress;
    
    @Column(name = "device_id", length = 100)
    private String deviceId;
    
    @Column(name = "client_version", length = 50)
    private String clientVersion;
    
    @Column(nullable = false, length = 20)
    private String status;  // NORMAL, LATE, EARLY_LEAVE, ABSENT, OVERTIME
    
    @Column(name = "remarks", length = 500)
    private String remarks;
    
    @Column(name = "anti_cheat_score", precision = 3, scale = 2)
    private Double antiCheatScore;  // 0.00-1.00
    
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
