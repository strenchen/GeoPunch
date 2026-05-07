import { Injectable, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisService implements OnModuleInit {
  private client: Redis;

  async onModuleInit() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0'),
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });

    this.client.on('connect', () => {
      console.log('✅ Redis 连接成功');
    });

    this.client.on('error', (err) => {
      console.error('❌ Redis 连接失败:', err.message);
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  // 获取
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  // 设置
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  // 删除
  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  // 批量删除
  async delPattern(pattern: string): Promise<void> {
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }

  // 分布式锁 - 获取锁
  async setLock(key: string, ttlSeconds = 10): Promise<boolean> {
    const result = await this.client.set(key, '1', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  // 分布式锁 - 释放锁
  async releaseLock(key: string): Promise<void> {
    await this.client.del(key);
  }

  // 限流计数器 - 令牌桶算法
  async rateLimit(
    key: string,
    maxRequests: number,
    windowSeconds: number,
  ): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
    const current = await this.client.incr(key);
    
    if (current === 1) {
      // 第一次请求，设置过期时间
      await this.client.expire(key, windowSeconds);
    }

    const ttl = await this.client.ttl(key);
    const remaining = Math.max(0, maxRequests - current);
    
    return {
      allowed: current <= maxRequests,
      remaining,
      resetIn: ttl > 0 ? ttl : windowSeconds,
    };
  }

  // 滑动窗口限流
  async slidingWindowRateLimit(
    key: string,
    maxRequests: number,
    windowSeconds: number,
  ): Promise<{ allowed: boolean; remaining: number }> {
    const now = Date.now();
    const windowKey = `${key}:${Math.floor(now / 1000)}`;
    
    // 使用 Redis sorted set 实现滑动窗口
    const results = await this.client.pipeline()
      .zadd(windowKey, now, `${now}`)
      .zremrangebyrank(windowKey, 0, -1 - maxRequests)
      .zcard(windowKey)
      .expire(windowKey, windowSeconds)
      .exec();

    const count = results[2][1] as number;
    const allowed = count <= maxRequests;
    const remaining = Math.max(0, maxRequests - count);

    return { allowed, remaining };
  }

  // 获取计数
  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  // 设置过期时间
  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.client.expire(key, ttlSeconds);
  }

  // 获取 TTL
  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  // 设置哈希
  async hset(key: string, field: string, value: string): Promise<void> {
    await this.client.hset(key, field, value);
  }

  // 获取哈希字段
  async hget(key: string, field: string): Promise<string | null> {
    return this.client.hget(key, field);
  }

  // 获取所有哈希字段
  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key) as any;
  }

  // 获取客户端（用于高级操作）
  getClient(): Redis {
    return this.client;
  }
}