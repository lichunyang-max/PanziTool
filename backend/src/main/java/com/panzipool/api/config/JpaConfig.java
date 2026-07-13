package com.panzipool.api.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * JPA 配置。
 *
 * <p>启用 JPA Auditing，支持实体上的 {@code @CreatedDate} / {@code @LastModifiedDate}
 * 自动填充时间字段（Task 3 的实体将使用）。</p>
 */
@Configuration
@EnableJpaAuditing
public class JpaConfig {
}
