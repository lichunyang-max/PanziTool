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
 *
 * <p>业务模块按 {@code web/{module}/} 组织：
 * <ul>
 *   <li>web/tool —— 工具元数据、计数查询与点赞</li>
 *   <li>web/event —— 匿名统计事件上报与聚合</li>
 *   <li>web/ad —— 广告推广查询</li>
 *   <li>web/ping —— 健康探针与示例接口</li>
 * </ul>
 * 共享基础设施（{@code common/}、{@code config/}、{@code exception/}）位于根包下。</p>
 */
@SpringBootApplication
@ConfigurationPropertiesScan(basePackages = "com.panzipool.api")
@EnableScheduling
public class PanziPoolApplication {

    public static void main(String[] args) {
        SpringApplication.run(PanziPoolApplication.class, args);
    }
}