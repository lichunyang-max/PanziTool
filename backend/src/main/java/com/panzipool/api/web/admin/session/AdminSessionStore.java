package com.panzipool.api.web.admin.session;

import com.panzipool.api.web.admin.config.AdminProperties;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * 管理员会话内存存储。
 *
 * <p>使用 {@link ConcurrentHashMap} 维护 token → {@link AdminSession} 映射。
 * 通过单线程 {@link ScheduledExecutorService} 每 10 分钟清理一次过期会话，
 * 同时在访问时惰性清理过期 token。</p>
 *
 * <p><b>局限性</b>：内存存储不适用于多实例部署（会话不跨节点共享）。
 * 多实例场景需替换为 Redis 等共享存储。</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AdminSessionStore {

    /** 清理过期会话的调度周期（分钟） */
    private static final long CLEANUP_INTERVAL_MINUTES = 10L;

    private final AdminProperties adminProperties;

    /** key = token，value = 会话对象 */
    private final ConcurrentHashMap<String, AdminSession> sessions = new ConcurrentHashMap<>();

    /** 单线程调度器，负责周期性清理过期会话 */
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "admin-session-cleanup");
        t.setDaemon(true);
        return t;
    });

    /**
     * 启动后周期性清理过期会话。
     */
    @PostConstruct
    public void init() {
        scheduler.scheduleAtFixedRate(
                this::cleanupExpired,
                CLEANUP_INTERVAL_MINUTES,
                CLEANUP_INTERVAL_MINUTES,
                TimeUnit.MINUTES);
        log.debug("管理员会话清理调度器已启动，周期 {} 分钟", CLEANUP_INTERVAL_MINUTES);
    }

    /**
     * 容器销毁时关闭调度器，避免线程泄漏。
     */
    @PreDestroy
    public void destroy() {
        scheduler.shutdownNow();
    }

    /**
     * 创建新的管理员会话。
     *
     * @param username 管理员用户名
     * @return 新建会话（包含 UUID 令牌与过期时间）
     */
    public AdminSession createSession(String username) {
        String token = UUID.randomUUID().toString();
        Instant expireAt = Instant.now().plus(Duration.ofMinutes(adminProperties.getSessionTimeoutMinutes()));
        AdminSession session = new AdminSession(token, username, expireAt);
        sessions.put(token, session);
        log.debug("管理员会话已创建: username={}, expireAt={}", username, expireAt);
        return session;
    }

    /**
     * 根据令牌获取会话；若会话不存在或已过期则返回 {@link Optional#empty()}。
     *
     * <p>过期会话会在本次访问时被惰性移除。</p>
     *
     * @param token 访问令牌
     * @return 有效会话的 Optional 包装
     */
    public Optional<AdminSession> getSession(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        AdminSession session = sessions.get(token);
        if (session == null) {
            return Optional.empty();
        }
        if (session.isExpired()) {
            sessions.remove(token);
            log.debug("访问命中过期会话，已移除: token={}", token);
            return Optional.empty();
        }
        return Optional.of(session);
    }

    /**
     * 移除指定令牌的会话（用于登出）。
     *
     * @param token 访问令牌
     */
    public void removeSession(String token) {
        if (token != null) {
            sessions.remove(token);
        }
    }

    /**
     * 清理所有过期会话。
     *
     * @return 实际清理的会话数量
     */
    public int cleanupExpired() {
        int before = sessions.size();
        sessions.entrySet().removeIf(entry -> entry.getValue().isExpired());
        int removed = before - sessions.size();
        if (removed > 0) {
            log.info("清理过期管理员会话: removed={}, remaining={}", removed, sessions.size());
        }
        return removed;
    }
}
