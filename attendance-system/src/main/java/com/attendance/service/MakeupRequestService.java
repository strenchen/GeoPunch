package com.attendance.service;

import com.attendance.entity.MakeupRequest;
import com.attendance.repository.MakeupRequestRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class MakeupRequestService {

    private final MakeupRequestRepository makeupRequestRepository;

    public MakeupRequestService(MakeupRequestRepository makeupRequestRepository) {
        this.makeupRequestRepository = makeupRequestRepository;
    }

    @Transactional
    public MakeupRequest createRequest(Long employeeId, LocalDate makeupDate, 
                                        LocalDate originalDate, LocalDateTime checkInTime,
                                        LocalDateTime checkOutTime, String reason) {
        MakeupRequest request = MakeupRequest.builder()
                .employeeId(employeeId)
                .makeupDate(makeupDate)
                .originalDate(originalDate)
                .checkInTime(checkInTime)
                .checkOutTime(checkOutTime)
                .reason(reason)
                .status("PENDING")
                .build();
        
        return makeupRequestRepository.save(request);
    }

    public List<MakeupRequest> getMyRequests(Long employeeId) {
        return makeupRequestRepository.findByEmployeeIdOrderByCreatedAtDesc(employeeId);
    }

    public List<MakeupRequest> getPendingRequests() {
        return makeupRequestRepository.findByStatus("PENDING");
    }

    @Transactional
    public MakeupRequest approve(Long requestId, Long approverId, String comment) {
        MakeupRequest request = makeupRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("申请不存在"));
        
        request.setStatus("APPROVED");
        request.setApproverId(approverId);
        request.setApprovalComment(comment);
        request.setApprovedAt(LocalDateTime.now());
        
        return makeupRequestRepository.save(request);
    }
}
