package com.panzipool.api.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * OpenAPI / Swagger 文档配置。
 *
 * <p>Swagger UI 路径：{@code /api/v1/docs}（由 {@code springdoc.swagger-ui.path=/docs}
 * 配合 {@code server.servlet.context-path=/api/v1} 拼接而成）。</p>
 * <p>OpenAPI JSON 路径：{@code /api/v1/docs-json}。</p>
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI panzipoolOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("PanziPool API")
                        .description("盘子工具（PanziTool）在线工具聚合站后端 API —— 统计上报、点赞、工具元数据查询")
                        .version("1.0")
                        .contact(new Contact()
                                .name("PanziPool")
                                .url("https://www.panzipool.com")
                                .email("contact@panzipool.com")))
                .servers(List.of(new Server()
                        .url("/api/v1")
                        .description("API 统一前缀")));
    }
}
