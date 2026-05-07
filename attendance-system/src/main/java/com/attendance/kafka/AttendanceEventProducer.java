package com.attendance.kafka;

import com.attendance.config.KafkaConfig;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class AttendanceEventProducer {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public AttendanceEventProducer(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void sendAttendanceEvent(AttendanceEvent event) {
        kafkaTemplate.send(KafkaConfig.TOPIC_ATTENDANCE_EVENT, event.getEmployeeId().toString(), event);
    }

    public void sendLeaveRequestEvent(LeaveRequestEvent event) {
        kafkaTemplate.send(KafkaConfig.TOPIC_LEAVE_REQUEST, event.getEmployeeId().toString(), event);
    }

    public void sendNotificationEvent(NotificationEvent event) {
        kafkaTemplate.send(KafkaConfig.TOPIC_NOTIFICATION, event.getTargetEmployeeId().toString(), event);
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AttendanceEvent {
        private Long employeeId;
        private String eventType;  // CHECK_IN, CHECK_OUT
        private String workDate;
        private LocalDateTime eventTime;
        private Double latitude;
        private Double longitude;
        private Double antiCheatScore;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class LeaveRequestEvent {
        private Long employeeId;
        private Long requestId;
        private String leaveType;
        private String status;  // CREATED, APPROVED, REJECTED
        private LocalDateTime eventTime;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class NotificationEvent {
        private Long targetEmployeeId;
        private String title;
        private String content;
        private String type;  // LEAVE_REMINDER, ATTENDANCE_ALERT, etc.
        private LocalDateTime eventTime;
    }
}
