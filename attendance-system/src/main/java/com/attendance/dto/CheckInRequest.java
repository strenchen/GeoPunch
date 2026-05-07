package com.attendance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CheckInRequest {
    @NotNull(message = "纬度不能为空")
    private Double latitude;
    
    @NotNull(message = "经度不能为空")
    private Double longitude;
    
    private String address;
    
    private String photoBase64;
    
    @NotBlank(message = "设备ID不能为空")
    private String deviceId;
    
    @NotBlank(message = "客户端版本不能为空")
    private String clientVersion;
    
    private String remark;
}
