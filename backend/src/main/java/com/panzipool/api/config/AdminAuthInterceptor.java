package com.panzipool.api.config;

import com.panzipool.api.web.admin.service.AdminAuthService;
import com.panzipool.api.web.admin.session.AdminSession;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Optional;

/**
 * 管理员认证拦截器。
 *
 * <p>对 {@code /admin/**} 路径（登录接口除外）进行会话校验：
 * 从 {@code admin_token} Cookie 或 {@code Authorization: Bearer} 头读取令牌，
 * 校验会话有效性。无效则直接写回 401 JSON 响应；有效则将用户名写入请求属性
 * {@code adminUser} 供后续控制器使用。</p>
 */
@Component
public class AdminAuthInterceptor implements HandlerInterceptor {

    private static final Logger log = LoggerFactory.getLogger(AdminAuthInterceptor.class);

    private static final String COOKIE_NAME = "admin_token";
    private static final String HEADER_AUTHORIZATION = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";
    private static final String ATTR_ADMIN_USER = "adminUser";

    private final AdminAuthService authService;

    public AdminAuthInterceptor(AdminAuthService authService) {
        this.authService = authService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // 放行 CORS 预检请求（OPTIONS 不携带 Cookie/Auth 头，需跳过认证）
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        String token = extractToken(request);
        Optional<AdminSession> sessionOpt = authService.validateSession(token);
        if (sessionOpt.isEmpty()) {
            log.warn("管理员认证失败: uri={}, method={}", request.getRequestURI(), request.getMethod());
            response.setStatus(HttpStatus.UNAUTHORIZED.value());
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"code\":401,\"message\":\"未登录或会话已过期\"}");
            return false;
        }
        request.setAttribute(ATTR_ADMIN_USER, sessionOpt.get().getUsername());
        return true;
    }

    /**
     * 提取访问令牌。优先级：admin_token Cookie > Authorization: Bearer 头。
     */
    private String extractToken(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if (COOKIE_NAME.equals(cookie.getName())) {
                    return cookie.getValue();
                }
            }
        }
        String header = request.getHeader(HEADER_AUTHORIZATION);
        if (header != null && header.startsWith(BEARER_PREFIX)) {
            return header.substring(BEARER_PREFIX.length()).trim();
        }
        return null;
    }
}
