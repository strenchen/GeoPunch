package com.attendance.service;

import com.attendance.dto.CheckInRequest;
import com.attendance.dto.CheckInResponse;
import com.attendance.entity.AttendanceRecord;
import com.attendance.entity.Employee;
import com.attendance.repository.AttendanceRecordRepository;
import com.attendance.repository.EmployeeRepository;
import com.attendance.util.AntiCheatUtil;
import com.attendance.util.LocationUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.concurrent.TimeUnit;

@Service
public class AttendanceService {

    private final AttendanceRecordRepository attendanceRecordRepository;
    private final EmployeeRepository employeeRepository;
    private final StringRedisTemplate redisTemplate;

    @Value("${attendance.check-in.start-offset-minutes:30}")
    private int startOffsetMinutes;

    @Value("${attendance.check-in.end-offset-minutes:120}")
    private int endOffsetMinutes;

    @Value("${attendance.location.max-distance-meters:500}")
    private double maxDistanceMeters;

    private static final String CHECKIN_LOCK_PREFIX = "lock:checkin:";

    @Transactional
    public CheckInResponse checkIn(Long employeeId, CheckInRequest request) {
        // 分布式锁保证幂等性
        String lockKey = CHECKIN_LOCK_PREFIX + employeeId + ":" + LocalDate.now();
        String lockValue = redisTemplate.opsForValue().get(lockKey);
        
        if (lockValue != null) {
            throw new RuntimeException("今日已打卡，请勿重复操作");
        }
        
        Boolean acquired = redisTemplate.opsForValue()
                .setIfAbsent(lockKey, "1", 5, TimeUnit.MINUTES);
        if (Boolean.FALSE.equals(acquired)) {
            throw new RuntimeException("打卡处理中，请稍后重试");
        }

        try {
            Employee employee = employeeRepository.findById(employeeId)
                    .orElseThrow(() -> new RuntimeException("员工不存在"));

            LocalDate today = LocalDate.now();
            
            // 查询今天的打卡记录
            AttendanceRecord record = attendanceRecordRepository
                    .findByEmployeeIdAndWorkDate(employeeId, today)
                    .orElse(null);

            LocalDateTime now = LocalDateTime.now();
            
            if (record == null) {
                // 上班打卡
                return doCheckIn(employeeId, employee, request, today, now);
            } else if (record.getCheckOutTime() == null) {
                // 下班打卡
                return doCheckOut(record, request, now);
            } else {
                throw new RuntimeException("今日已打卡完毕");
            }
        } finally {
            redisTemplate.delete(lockKey);
        }
    }

    private CheckInResponse doCheckIn(Long employeeId, Employee employee, 
                                       CheckInRequest request, LocalDate today, LocalDateTime now) {
        // 位置校验
        double companyLat = employee.getCompanyLat() != null ? employee.getCompanyLat() : 31.230416;
        double companyLng = employee.getCompanyLng() != null ? employee.getCompanyLng() : 121.473701;
        
        double distance = LocationUtil.calculateDistance(
                request.getLatitude(), request.getLongitude(), companyLat, companyLng);
        
        double distanceScore = Math.max(0, 1 - (distance / maxDistanceMeters));
        boolean isInRange = distance <= maxDistanceMeters;

        // 评估作弊风险
        double riskScore = AntiCheatUtil.assessRiskScore(distanceScore, !isInRange, null);

        AttendanceRecord record = AttendanceRecord.builder()
                .employeeId(employeeId)
                .workDate(today)
                .checkInTime(now)
                .checkInLat(request.getLatitude())
                .checkInLng(request.getLongitude())
                .checkInAddress(request.getAddress())
                .deviceId(request.getDeviceId())
                .clientVersion(request.getClientVersion())
                .status(determineStatus(now))
                .antiCheatScore(1 - riskScore)
                .remarks(request.getRemark())
                .build();

        attendanceRecordRepository.save(record);

        String message = isInRange ? "打卡成功" : "打卡成功，但位置异常";
        
        return CheckInResponse.builder()
                .recordId(record.getId())
                .checkInTime(now)
                .status(record.getStatus())
                .message(message)
                .distanceMeters(distance)
                .antiCheatScore(record.getAntiCheatScore())
                .build();
    }

    private CheckInResponse doCheckOut(AttendanceRecord record, CheckInRequest request, LocalDateTime now) {
        record.setCheckOutTime(now);
        record.setCheckOutLat(request.getLatitude());
        record.setCheckOutLng(request.getLongitude());
        record.setCheckOutAddress(request.getAddress());
        
        attendanceRecordRepository.save(record);

        return CheckInResponse.builder()
                .recordId(record.getId())
                .checkInTime(record.getCheckInTime())
                .checkOutTime(now)
                .status(record.getStatus())
                .message("下班打卡成功")
                .build();
    }

    private String determineStatus(LocalDateTime checkInTime) {
        int hour = checkInTime.getHour();
        int minute = checkInTime.getMinute();
        
        // 9:00之前正常，9:00-9:30迟到，9:30之后算严重迟到
        if (hour < 9 || (hour == 9 && minute <= 0)) {
            return "NORMAL";
        } else if (hour == 9 && minute <= 30) {
            return "LATE";
        } else {
            return "SERIOUS_LATE";
        }
    }
}
