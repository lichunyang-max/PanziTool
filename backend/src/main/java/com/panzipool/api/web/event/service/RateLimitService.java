package com.panzipool.api.web.event.service;

/**
 * 内存频率限制服务接口。
 *
 * <p>基于固定时间窗口（1 分钟）+ 滑动窗口清理实现简易限流。
 * 使用 {@code ConcurrentHashMap} 存储每个 key（anon_id/IP）的请求时间戳队列，
 * 每次请求先清理过期时间戳，再判断是否超限。</p>
 */
public interface RateLimitService {

    /**
     * 检查 anon_id 与 IP 是否超过频率限制。
     *
     * @param anonId   匿名用户 ID
     * @param clientIp 客户端 IP
     * @throws com.panzipool.api.exception.RateLimitExceededException 当任一维度超限时抛出
     */
    void checkRateLimit(String anonId, String clientIp);

    /**
     * 重置所有限流计数器（仅供测试使用）。
     */
    void reset();
}