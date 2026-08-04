package com.panzipool.api.web.admin.service;

import com.panzipool.api.common.ApiConstants;
import com.panzipool.api.common.BusinessException;
import com.panzipool.api.web.admin.dao.AdminUserRepository;
import com.panzipool.api.web.admin.dto.AdminLoginResponse;
import com.panzipool.api.web.admin.entity.AdminUser;
import com.panzipool.api.web.admin.session.AdminSession;
import com.panzipool.api.web.admin.session.AdminSessionStore;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Deque;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminAuthService {

    private static final int MAX_FAILURES = 5;
    private static final long FAILURE_WINDOW_MS = 5 * 60_000L;

    private final AdminUserRepository adminUserRepository;
    private final AdminSessionStore sessionStore;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    private final ConcurrentHashMap<String, Deque<Long>> ipFailures = new ConcurrentHashMap<>();

    public AdminLoginResponse login(String username, String password, String ip) {
        checkRateLimit(ip);

        AdminUser admin = adminUserRepository.findByUsernameAndEnabledTrue(username)
                .orElseThrow(() -> {
                    recordFailure(ip);
                    log.warn("管理员登录失败(用户不存在): ip={}, username={}", ip, username);
                    return new BusinessException(ApiConstants.CODE_UNAUTHORIZED,
                            "账号或密码错误", HttpStatus.UNAUTHORIZED);
                });

        if (!passwordEncoder.matches(password, admin.getPasswordHash())) {
            recordFailure(ip);
            log.warn("管理员登录失败(密码错误): ip={}, username={}", ip, username);
            throw new BusinessException(ApiConstants.CODE_UNAUTHORIZED,
                    "账号或密码错误", HttpStatus.UNAUTHORIZED);
        }

        clearFailures(ip);
        admin.setLastLoginAt(LocalDateTime.now());
        adminUserRepository.save(admin);

        AdminSession session = sessionStore.createSession(admin.getUsername());
        log.info("管理员登录成功: username={}, ip={}", username, ip);
        return new AdminLoginResponse(session.getToken(), session.getUsername(), session.getExpireAt());
    }

    public void logout(String token) {
        sessionStore.removeSession(token);
    }

    public Optional<AdminSession> validateSession(String token) {
        return sessionStore.getSession(token);
    }

    private void checkRateLimit(String ip) {
        if (ip == null || ip.isBlank()) {
            return;
        }
        long now = System.currentTimeMillis();
        ipFailures.compute(ip, (key, deque) -> {
            if (deque == null) {
                deque = new ConcurrentLinkedDeque<>();
            }
            long threshold = now - FAILURE_WINDOW_MS;
            while (!deque.isEmpty() && deque.peekFirst() < threshold) {
                deque.pollFirst();
            }
            if (deque.size() >= MAX_FAILURES) {
                log.warn("管理员登录限流触发: ip={}, failures={}", ip, deque.size());
                throw new BusinessException(ApiConstants.CODE_TOO_MANY_REQUESTS,
                        "登录失败次数过多，请稍后再试", HttpStatus.TOO_MANY_REQUESTS);
            }
            return deque;
        });
    }

    private void recordFailure(String ip) {
        if (ip == null || ip.isBlank()) {
            return;
        }
        ipFailures.compute(ip, (key, deque) -> {
            if (deque == null) {
                deque = new ConcurrentLinkedDeque<>();
            }
            deque.addLast(System.currentTimeMillis());
            return deque;
        });
    }

    private void clearFailures(String ip) {
        if (ip == null) {
            return;
        }
        ipFailures.remove(ip);
    }
}
