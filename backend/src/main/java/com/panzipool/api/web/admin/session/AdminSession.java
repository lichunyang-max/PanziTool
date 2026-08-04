package com.panzipool.api.web.admin.session;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.Instant;

/**
 * 管理员会话数据载体。
 *
 * <p>由 {@link AdminSessionStore} 在登录成功时创建，保存于内存中，
 * 携带访问令牌、用户名与过期时间。</p>
 */
@Data
@AllArgsConstructor
public class AdminSession {

    /** 会话访问令牌（UUID） */
    private String token;

    /** 管理员用户名 */
    private String username;

    /** 会话过期时间（UTC） */
    private Instant expireAt;

    /**
     * 判断会话是否已过期。
     *
     * @return 当前时间已超过 {@link #expireAt} 时返回 true
     */
    public boolean isExpired() {
        return Instant.now().isAfter(expireAt);
    }
}
