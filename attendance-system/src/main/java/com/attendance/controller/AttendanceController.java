package com.attendance.controller;

import com.attendance.dto.CheckInRequest;
import com.attendance.dto.CheckInResponse;
import com.attendance.service.AttendanceService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/attendance")
public class AttendanceController {

    private final AttendanceService attendanceService;

    public AttendanceController(AttendanceService attendanceService) {
        this.attendanceService = attendanceService;
    }

    @PostMapping("/checkin")
    public ResponseEntity<CheckInResponse> checkIn(
            @Valid @RequestBody CheckInRequest request,
            Authentication authentication) {
        Long employeeId = (Long) authentication.getPrincipal();
        CheckInResponse response = attendanceService.checkIn(employeeId, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/today")
    public ResponseEntity<Map<String, Object>> getTodayAttendance(Authentication authentication) {
        Long employeeId = (Long) authentication.getPrincipal();
        // TODO: 查询今日打卡记录
        return ResponseEntity.ok(Map.of("employeeId", employeeId));
    }
}
