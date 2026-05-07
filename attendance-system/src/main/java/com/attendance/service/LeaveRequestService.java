package com.attendance.service;

import com.attendance.entity.LeaveRequest;
import com.attendance.repository.LeaveRequestRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class LeaveRequestService {

    private final LeaveRequestRepository leaveRequestRepository;

    public LeaveRequestService(LeaveRequestRepository leaveRequestRepository) {
        this.leaveRequestRepository = leaveRequestRepository;
    }

    @Transactional
    public LeaveRequest createRequest(Long employeeId, String leaveType, LocalDate startDate, 
                                      LocalDate endDate, Double days, String reason) {
        LeaveRequest request = LeaveRequest.builder()
                .employeeId(employeeId)
                .leaveType(leaveType)
                .startDate(startDate)
                .endDate(endDate)
                .days(days)
                .reason(reason)
                .status("PENDING")
                .build();
        
        return leaveRequestRepository.save(request);
    }

    public List<LeaveRequest> getMyRequests(Long employeeId) {
        return leaveRequestRepository.findByEmployeeIdOrderByCreatedAtDesc(employeeId);
    }

    public List<LeaveRequest> getPendingRequests() {
        return leaveRequestRepository.findByStatus("PENDING");
    }

    @Transactional
    public LeaveRequest approve(Long requestId, Long approverId, String comment) {
        LeaveRequest request = leaveRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("申请不存在"));
        
        request.setStatus("APPROVED");
        request.setApproverId(approverId);
        request.setApprovalComment(comment);
        request.setApprovedAt(java.time.LocalDateTime.now());
        
        return leaveRequestRepository.save(request);
    }

    @Transactional
    public LeaveRequest reject(Long requestId, Long approverId, String comment) {
        LeaveRequest request = leaveRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("申请不存在"));
        
        request.setStatus("REJECTED");
        request.setApproverId(approverId);
        request.setApprovalComment(comment);
        request.setApprovedAt(java.time.LocalDateTime.now());
        
        return leaveRequestRepository.save(request);
    }
}
