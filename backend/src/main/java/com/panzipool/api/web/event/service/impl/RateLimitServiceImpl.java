package com.panzipool.api.web.event.service.impl;

import com.panzipool.api.exception.RateLimitExceededException;
import com.panzipool.api.web.event.service.RateLimitProperties;
import com.panzipool.api.web.event.service.RateLimitService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

/**
 * 内存频率限制服务实现。
 *
 * <p><b>局限性</b>：内存限流不适用于多实例部署（不跨节点共享），
 * 生产环境建议升级为 Redis 滑动窗口限流（Lua 脚本）。</p>
 */
@Service
@RequiredArgsConstructor
public class RateLimitServiceImpl implements RateLimitService {

    private static final Logger log = LoggerFactory.getLogger(RateLimitServiceImpl.class);

    /** 1 分钟毫秒数 */
    private static final long WINDOW_MS = 60_000L;

    private final RateLimitProperties properties;

    /** key = "anon:{anonId}" 或 "ip:{clientIp}"，value = 请求时间戳毫秒队列 */
    private final ConcurrentHashMap<String, Deque<Long>> timeWindows = new ConcurrentHashMap<>();

    @Override
    public void checkRateLimit(String anonId, String clientIp) {
        checkLimit("anon:" + anonId, properties.getAnonIdPerMinute());
        checkLimit("ip:" + clientIp, properties.getIpPerMinute());
    }

    @Override
    public void reset() {
        timeWindows.clear();
        log.debug("限流计数器已重置");
    }

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
}