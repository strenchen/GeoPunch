package com.attendance.util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

public class AntiCheatUtil {
    
    /**
     * 计算照片的SHA-256哈希值
     */
    public static String calculatePhotoHash(byte[] photoData) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(photoData);
            return bytesToHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }
    
    /**
     * 计算字符串的SHA-256哈希值
     */
    public static String calculateSHA256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return bytesToHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }
    
    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
    
    /**
     * 生成带水印的照片哈希
     */
    public static String generateWatermarkedHash(String photoHash, String employeeId, String timestamp) {
        String combined = String.format("%s:%s:%s", photoHash, employeeId, timestamp);
        return calculateSHA256(combined);
    }
    
    /**
     * 评估作弊风险分数 (0.0-1.0, 越高风险越大)
     */
    public static double assessRiskScore(
            Double distanceScore,     // 距离评分 0-1
            Boolean locationChanged,   // 位置是否突变
            Double timeAnomalyScore    // 时间异常评分
    ) {
        double risk = 0.0;
        
        if (distanceScore != null) {
            risk += (1 - distanceScore) * 0.4;  // 距离权重40%
        }
        
        if (Boolean.TRUE.equals(locationChanged)) {
            risk += 0.3;  // 位置突变加30%
        }
        
        if (timeAnomalyScore != null) {
            risk += timeAnomalyScore * 0.3;  // 时间异常权重30%
        }
        
        return Math.min(1.0, risk);
    }
}
