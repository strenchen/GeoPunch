package com.attendance.util;

public class LocationUtil {
    
    private static final double EARTH_RADIUS_METERS = 6371000;

    /**
     * 使用Haversine公式计算两点之间的距离（米）
     */
    public static double calculateDistance(double lat1, double lng1, double lat2, double lng2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        
        return EARTH_RADIUS_METERS * c;
    }
    
    /**
     * 判断是否在有效打卡范围内
     */
    public static boolean isWithinRange(double userLat, double userLng, 
                                        double companyLat, double companyLng, 
                                        double maxDistanceMeters) {
        double distance = calculateDistance(userLat, userLng, companyLat, companyLng);
        return distance <= maxDistanceMeters;
    }
}
