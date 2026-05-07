package com.attendance.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CheckInResponse {
    private Long recordId;
    private LocalDateTime checkInTime;
    private LocalDateTime checkOutTime;
    private String status;
    private String message;
    private Double distanceMeters;
    private Double antiCheatScore;
}
