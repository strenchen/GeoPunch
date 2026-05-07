package com.attendance.kafka;

import com.attendance.config.KafkaConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Service
public class AttendanceEventConsumer {

    private static final Logger log = LoggerFactory.getLogger(AttendanceEventConsumer.class);

    @KafkaListener(topics = KafkaConfig.TOPIC_ATTENDANCE_EVENT, groupId = "attendance-group")
    public void consumeAttendanceEvent(AttendanceEventProducer.AttendanceEvent event) {
        log.info("收到考勤事件: employeeId={}, type={}, date={}", 
                event.getEmployeeId(), event.getEventType(), event.getWorkDate());
        // TODO: 处理考勤事件，如发送通知、更新统计等
    }

    @KafkaListener(topics = KafkaConfig.TOPIC_LEAVE_REQUEST, groupId = "attendance-group")
    public void consumeLeaveRequestEvent(AttendanceEventProducer.LeaveRequestEvent event) {
        log.info("收到请假事件: employeeId={}, requestId={}, status={}", 
                event.getEmployeeId(), event.getRequestId(), event.getStatus());
        // TODO: 处理请假事件，如发送通知等
    }

    @KafkaListener(topics = KafkaConfig.TOPIC_NOTIFICATION, groupId = "notification-group")
    public void consumeNotificationEvent(AttendanceEventProducer.NotificationEvent event) {
        log.info("收到通知事件: targetEmployeeId={}, title={}", 
                event.getTargetEmployeeId(), event.getTitle());
        // TODO: 处理通知发送
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AttendanceEvent {
        private Long employeeId;
        private String eventType;
        private String workDate;
        private java.time.LocalDateTime eventTime;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class LeaveRequestEvent {
        private Long employeeId;
        private Long requestId;
        private String leaveType;
        private String status;
        private java.time.LocalDateTime eventTime;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class NotificationEvent {
        private Long targetEmployeeId;
        private String title;
        private String content;
        private String type;
        private java.time.LocalDateTime eventTime;
    }
}
