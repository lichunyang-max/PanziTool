package com.panzipool.api.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.boot.autoconfigure.domain.EntityScan;

/**
 * JPA 配置。
 *
 * <p>启用 JPA Auditing，支持实体上的 {@code @CreatedDate} / {@code @LastModifiedDate}
 * 自动填充时间字段。</p>
 *
 * <p>显式配置实体扫描与 Repository 扫描，指向 {@code com.panzipool.api} 根包，
 * 以覆盖 {@code web.*} 子包下的实体与 Repository。</p>
 */
@Configuration
@EnableJpaAuditing
@EntityScan(basePackages = "com.panzipool.api")
@EnableJpaRepositories(basePackages = "com.panzipool.api")
public class JpaConfig {
}