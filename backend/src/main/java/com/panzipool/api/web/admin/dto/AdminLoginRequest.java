package com.panzipool.api.web.admin.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 管理员登录请求体。
 */
@Data
public class AdminLoginRequest {

    /** 管理员账号 */
    @NotBlank(message = "账号不能为空")
    private String username;

    /** 管理员密码（明文，仅用于与 BCrypt 哈希比对，不落盘） */
    @NotBlank(message = "密码不能为空")
    private String password;
}
