package com.panzipool.api.web.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.Instant;

/**
 * 管理员登录响应体。
 *
 * <p>同时作为 {@code GET /admin/me} 的响应，{@code token} 字段在 me 接口中复用会话令牌。</p>
 */
@Data
@AllArgsConstructor
public class AdminLoginResponse {

    /** 会话访问令牌 */
    private String token;

    /** 管理员用户名 */
    private String username;

    /** 会话过期时间（UTC） */
    private Instant expireAt;
}
