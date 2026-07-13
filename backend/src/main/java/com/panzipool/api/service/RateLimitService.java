package com.panzipool.api.service;

import com.panzipool.api.config.RateLimitProperties;
import com.panzipool.api.exception.RateLimitExceededException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

/**
 * 内存频率限制服务。
 *
 * <p>基于固定时间窗口（1 分钟）+ 滑动窗口清理实现简易限流。
 * 使用 {@link ConcurrentHashMap} 存储每个 key（anon_id/IP）的请求时间戳队列，
 * 每次请求先清理过期时间戳，再判断是否超限。</p>
 *
 * <p><b>局限性</b>：内存限流不适用于多实例部署（不跨节点共享），
 * 生产环境建议升级为 Redis 滑动窗口限流（Lua 脚本）。</p>
 */
@Service
public class RateLimitService {

    private static final Logger log = LoggerFactory.getLogger(RateLimitService.class);

    /** 1 分钟毫秒数 */
    private static final long WINDOW_MS = 60_000L;

    private final RateLimitProperties properties;

    /** key = "anon:{anonId}" 或 "ip:{clientIp}"，value = 请求时间戳毫秒队列 */
    private final ConcurrentHashMap<String, Deque<Long>> timeWindows = new ConcurrentHashMap<>();

    public RateLimitService(RateLimitProperties properties) {
        this.properties = properties;
    }

    /**
     * 检查 anon_id 与 IP 是否超过频率限制。
     *
     * @param anonId   匿名用户 ID
     * @param clientIp 客户端 IP
     * @throws RateLimitExceededException 当任一维度超限时抛出
     */
    public void checkRateLimit(String anonId, String clientIp) {
        checkLimit("anon:" + anonId, properties.getAnonIdPerMinute());
        checkLimit("ip:" + clientIp, properties.getIpPerMinute());
    }

    /**
     * 检查指定 key 是否超过最大请求数。
     *
     * <p>内部逻辑：</p>
     * <ol>
     *   <li>获取或创建该 key 的时间窗口队列</li>
     *   <li>清理超过窗口期（1 分钟）的过期时间戳</li>
     *   <li>判断剩余数量是否超过限制</li>
     *   <li>未超限则追加当前时间戳</li>
     * </ol>
     *
     * @param key        限流键
     * @param maxRequests 窗口内最大请求数
     * @throws RateLimitExceededException 超限时抛出
     */
    private void checkLimit(String key, int maxRequests) {
        long now = System.currentTimeMillis();
        timeWindows.compute(key, (k, deque) -> {
            if (deque == null) {
                deque = new ConcurrentLinkedDeque<>();
            }
            // 清理超过 1 分钟的过期记录
            long threshold = now - WINDOW_MS;
            while (!deque.isEmpty() && deque.peekFirst() < threshold) {
                deque.pollFirst();
            }
            // 判断是否超限
            if (deque.size() >= maxRequests) {
                log.warn("频率限制触发: key={}, current={}, max={}", key, deque.size(), maxRequests);
                throw new RateLimitExceededException();
            }
            // 追加当前请求时间戳
            deque.addLast(now);
            return deque;
        });
    }

    /**
     * 重置所有限流计数器（仅供测试使用）。
     *
     * <p>清除所有 anon_id 和 IP 的时间窗口记录。</p>
     */
    public void reset() {
        timeWindows.clear();
        log.debug("限流计数器已重置");
    }
}
