package com.panzipool.api.web.admin.controller;

import com.panzipool.api.common.ApiResponse;
import com.panzipool.api.common.ApiConstants;
import com.panzipool.api.common.BusinessException;
import com.panzipool.api.web.admin.config.AdminProperties;
import com.panzipool.api.web.admin.dto.AdminLoginRequest;
import com.panzipool.api.web.admin.dto.AdminLoginResponse;
import com.panzipool.api.web.admin.service.AdminAuthService;
import com.panzipool.api.web.admin.session.AdminSession;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;

/**
 * 管理员认证控制器。
 *
 * <p>所有路径自动携带 {@code /api/v1} 前缀（由 {@code server.servlet.context-path} 配置），
 * 因此 {@code @RequestMapping("/admin")} 对应实际路径 {@code /api/v1/admin}。</p>
 *
 * <p>提供以下接口：</p>
 * <ul>
 *   <li>{@code POST /admin/login} —— 登录，校验账号密码并下发会话 Cookie</li>
 *   <li>{@code POST /admin/logout} —— 登出，清除会话与 Cookie</li>
 *   <li>{@code GET /admin/me} —— 获取当前登录管理员信息（校验会话有效性）</li>
 * </ul>
 *
 * <p>会话令牌通过名为 {@code admin_token} 的 HttpOnly Cookie 传递，同时兼容
 * {@code Authorization: Bearer <token>} 请求头。</p>
 */
@Tag(name = "Admin Auth", description = "管理员认证")
@RestController
@RequestMapping("/admin")
public class AdminAuthController {

    private static final String COOKIE_NAME = "admin_token";
    private static final String COOKIE_PATH = "/api/v1";
    private static final String HEADER_X_FORWARDED_FOR = "X-Forwarded-For";
    private static final String HEADER_AUTHORIZATION = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";

    private final AdminAuthService authService;
    private final AdminProperties adminProperties;

    public AdminAuthController(AdminAuthService authService, AdminProperties adminProperties) {
        this.authService = authService;
        this.adminProperties = adminProperties;
    }

    /**
     * 管理员登录。
     *
     * <p>校验账号密码成功后，下发 {@code admin_token} HttpOnly Cookie
     * （SameSite=Strict，Path=/api/v1，Max-Age=会话超时秒数）。</p>
     */
    @Operation(summary = "管理员登录", description = "校验账号密码，成功后下发会话 Cookie")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "登录成功"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "账号或密码错误"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "429", description = "登录失败次数过多")
    })
    @PostMapping("/login")
    public ApiResponse<AdminLoginResponse> login(
            @Valid @RequestBody AdminLoginRequest request,
            HttpServletRequest servletRequest,
            HttpServletResponse servletResponse) {
        String clientIp = extractClientIp(servletRequest);
        AdminLoginResponse response = authService.login(request.getUsername(), request.getPassword(), clientIp);
        // 下发 HttpOnly Cookie
        ResponseCookie cookie = ResponseCookie.from(COOKIE_NAME, response.getToken())
                .httpOnly(true)
                .secure(adminProperties.isSecureCookie())
                .sameSite("Strict")
                .path(COOKIE_PATH)
                .maxAge((long) adminProperties.getSessionTimeoutMinutes() * 60)
                .build();
        servletResponse.setHeader("Set-Cookie", cookie.toString());
        return ApiResponse.success(response);
    }

    /**
     * 管理员登出。
     *
     * <p>从 Cookie 或 Authorization 头读取令牌，移除会话，并清除 Cookie（Max-Age=0）。</p>
     */
    @Operation(summary = "管理员登出", description = "移除会话并清除 Cookie")
    @PostMapping("/logout")
    public ApiResponse<Void> logout(HttpServletRequest servletRequest, HttpServletResponse servletResponse) {
        String token = extractToken(servletRequest);
        authService.logout(token);
        // 清除 Cookie
        ResponseCookie cookie = ResponseCookie.from(COOKIE_NAME, "")
                .httpOnly(true)
                .secure(adminProperties.isSecureCookie())
                .sameSite("Strict")
                .path(COOKIE_PATH)
                .maxAge(0)
                .build();
        servletResponse.setHeader("Set-Cookie", cookie.toString());
        return ApiResponse.success();
    }

    /**
     * 获取当前登录管理员信息。
     *
     * <p>校验会话有效性，无效则抛出 401。</p>
     */
    @Operation(summary = "获取当前登录信息", description = "校验会话并返回当前登录管理员信息")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "已登录"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "未登录或会话已过期")
    })
    @GetMapping("/me")
    public ApiResponse<AdminLoginResponse> me(HttpServletRequest servletRequest) {
        String token = extractToken(servletRequest);
        Optional<AdminSession> sessionOpt = authService.validateSession(token);
        if (sessionOpt.isEmpty()) {
            throw new BusinessException(ApiConstants.CODE_UNAUTHORIZED,
                    "未登录或会话已过期", HttpStatus.UNAUTHORIZED);
        }
        AdminSession session = sessionOpt.get();
        return ApiResponse.success(new AdminLoginResponse(
                session.getToken(), session.getUsername(), session.getExpireAt()));
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

    /**
     * 提取客户端真实 IP。优先级：X-Forwarded-For（取第一个） > RemoteAddr。
     */
    private String extractClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader(HEADER_X_FORWARDED_FOR);
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            int commaIndex = xForwardedFor.indexOf(',');
            return commaIndex > 0
                    ? xForwardedFor.substring(0, commaIndex).trim()
                    : xForwardedFor.trim();
        }
        return request.getRemoteAddr();
    }
}
