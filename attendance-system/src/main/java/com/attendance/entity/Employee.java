package com.attendance.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "employee")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Employee {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, unique = true, length = 50)
    private String username;
    
    @Column(nullable = false)
    private String password;
    
    @Column(nullable = false, length = 100)
    private String realName;
    
    @Column(length = 20)
    private String phone;
    
    @Column(length = 100)
    private String email;
    
    @Column(name = "employee_type", nullable = false, length = 20)
    private String employeeType;  // FULL_TIME, PART_TIME, CONTRACTOR
    
    @Column(nullable = false, length = 20)
    private String role;  // ADMIN, MANAGER, EMPLOYEE
    
    @Column(name = "department_id")
    private Long departmentId;
    
    @Column(name = "work_location", length = 200)
    private String workLocation;
    
    @Column(name = "company_lat", precision = 10, scale = 7)
    private Double companyLat;
    
    @Column(name = "company_lng", precision = 10, scale = 7)
    private Double companyLng;
    
    @Column(name = "hire_date")
    private LocalDate hireDate;
    
    @Column(length = 20)
    private String status;  // ACTIVE, INACTIVE, RESIGNED
    
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
