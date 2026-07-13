package com.panzipool.api.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.List;

/**
 * CORS 全局配置。
 *
 * <p>通过 {@link WebMvcConfigurer#addCorsMappings} 对所有路径 {@code /**} 生效，
 * 允许的源从 {@link CorsProperties} 读取（可由环境变量 {@code CORS_ORIGINS} 切换）。</p>
 *
 * <p>注意：生产环境仅允许 {@code https://www.panzipool.com}；开发环境允许 localhost。</p>
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    private final CorsProperties properties;

    public CorsConfig(CorsProperties properties) {
        this.properties = properties;
    }

    @Override
    public void addCorsMappings(@NonNull CorsRegistry registry) {
        List<String> origins = properties.allowedOrigins();
        if (origins == null || origins.isEmpty()) {
            // 未配置时不注册 CORS，避免误放开
            return;
        }
        registry.addMapping("/**")
                .allowedOrigins(origins.toArray(new String[0]))
                .allowedMethods(properties.allowedMethods().toArray(new String[0]))
                .allowedHeaders(properties.allowedHeaders().toArray(new String[0]))
                .allowCredentials(properties.allowCredentials())
                .maxAge(properties.maxAge());
    }
}
