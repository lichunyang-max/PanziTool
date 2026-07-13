package com.panzipool.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * PanziPool（PanziTool 在线工具聚合站）后端 API 启动类。
 *
 * <p>统一接口前缀 {@code /api/v1} 通过 {@code server.servlet.context-path} 配置，
 * 因此各 Controller 的 {@code @RequestMapping} 无需重复书写 {@code /api/v1}。</p>
 */
@SpringBootApplication
@ConfigurationPropertiesScan(basePackages = "com.panzipool.api")
@EnableScheduling
public class PanziPoolApplication {

    public static void main(String[] args) {
        SpringApplication.run(PanziPoolApplication.class, args);
    }
}
