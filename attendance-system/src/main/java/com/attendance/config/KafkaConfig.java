package com.attendance.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
public class KafkaConfig {

    public static final String TOPIC_ATTENDANCE_EVENT = "attendance-events";
    public static final String TOPIC_LEAVE_REQUEST = "leave-requests";
    public static final String TOPIC_NOTIFICATION = "notifications";

    @Bean
    public NewTopic attendanceEventsTopic() {
        return TopicBuilder.name(TOPIC_ATTENDANCE_EVENT)
                .partitions(3)
                .replicas(1)
                .build();
    }

    @Bean
    public NewTopic leaveRequestsTopic() {
        return TopicBuilder.name(TOPIC_LEAVE_REQUEST)
                .partitions(3)
                .replicas(1)
                .build();
    }

    @Bean
    public NewTopic notificationsTopic() {
        return TopicBuilder.name(TOPIC_NOTIFICATION)
                .partitions(3)
                .replicas(1)
                .build();
    }
}
