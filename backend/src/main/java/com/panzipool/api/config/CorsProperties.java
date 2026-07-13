package com.panzipool.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/**
 * CORS 配置属性。
 *
 * <p>绑定 {@code panzipool.cors.*} 配置项。允许的源通过环境变量
 * {@code CORS_ORIGINS} 切换（逗号分隔），实现开发/生产环境隔离：</p>
 * <ul>
 *   <li>开发：{@code CORS_ORIGINS=http://localhost:3000}</li>
 *   <li>生产：{@code CORS_ORIGINS=https://www.panzipool.com}</li>
 * </ul>
 *
 * @param allowedOrigins 允许的源列表
 * @param allowedMethods 允许的 HTTP 方法
 * @param allowedHeaders 允许的请求头
 * @param allowCredentials 是否允许携带凭证
 * @param maxAge 预检请求缓存秒数
 */
@ConfigurationProperties(prefix = "panzipool.cors")
public record CorsProperties(
        List<String> allowedOrigins,
        List<String> allowedMethods,
        List<String> allowedHeaders,
        boolean allowCredentials,
        long maxAge
) {
}
