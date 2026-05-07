package com.attendance.service;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Service
public class RateLimitService {

    private final StringRedisTemplate redisTemplate;

    public RateLimitService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * 基于Token Bucket算法的限流
     * @param key 限流key
     * @param maxRequests 最大请求数
     * @param windowSeconds 时间窗口(秒)
     * @return true表示允许, false表示被限流
     */
    public boolean isAllowed(String key, int maxRequests, long windowSeconds) {
        String redisKey = "ratelimit:" + key;
        Long current = redisTemplate.opsForValue().increment(redisKey);
        
        if (current == null) {
            return false;
        }
        
        if (current == 1) {
            redisTemplate.expire(redisKey, windowSeconds, TimeUnit.SECONDS);
        }
        
        return current <= maxRequests;
    }

    /**
     * 滑动窗口限流
     */
    public boolean isAllowedSliding(String key, int maxRequests, long windowSeconds) {
        String redisKey = "ratelimit:sliding:" + key;
        long now = System.currentTimeMillis();
        long windowStart = now - (windowSeconds * 1000);
        
        // 删除窗口外的记录
        redisTemplate.opsForZSet().removeRangeByScore(redisKey, 0, windowStart);
        
        // 统计当前窗口内的请求数
        Long count = redisTemplate.opsForZSet().zCard(redisKey);
        
        if (count != null && count >= maxRequests) {
            return false;
        }
        
        // 记录当前请求
        redisTemplate.opsForZSet().add(redisKey, String.valueOf(now), now);
        redisTemplate.expire(redisKey, windowSeconds, TimeUnit.SECONDS);
        
        return true;
    }
}
