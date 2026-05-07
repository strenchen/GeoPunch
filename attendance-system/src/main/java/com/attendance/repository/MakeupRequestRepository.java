package com.attendance.repository;

import com.attendance.entity.MakeupRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MakeupRequestRepository extends JpaRepository<MakeupRequest, Long> {
    
    List<MakeupRequest> findByEmployeeIdOrderByCreatedAtDesc(Long employeeId);
    
    List<MakeupRequest> findByStatus(String status);
    
    Optional<MakeupRequest> findByEmployeeIdAndMakeupDate(Long employeeId, java.time.LocalDate makeupDate);
}
