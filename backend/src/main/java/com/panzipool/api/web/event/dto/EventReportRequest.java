package com.panzipool.api.web.event.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

/**
 * 匿名统计事件上报请求 DTO。
 */
@Schema(description = "事件上报请求")
@Data
public class EventReportRequest {

    private static final String UUID_PATTERN =
            "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$";

    private static final String EVENT_TYPE_PATTERN = "^(page_view|tool_use|copy|download)$";

    @Schema(description = "工具 slug（可选，page_view 事件可不带）", example = "json-formatter")
    @JsonProperty("tool_slug")
    private String toolSlug;

    @Schema(description = "匿名用户 ID（UUID v4，客户端 localStorage 生成）",
            example = "550e8400-e29b-41d4-a716-446655440000", requiredMode = Schema.RequiredMode.REQUIRED)
    @JsonProperty("anon_id")
    @NotBlank(message = "anon_id 不能为空")
    @Pattern(regexp = UUID_PATTERN, message = "anon_id 格式不正确，应为标准 UUID（如 550e8400-e29b-41d4-a716-446655440000）")
    private String anonId;

    @Schema(description = "事件类型：page_view / tool_use / copy / download",
            example = "tool_use", requiredMode = Schema.RequiredMode.REQUIRED)
    @JsonProperty("event_type")
    @NotBlank(message = "event_type 不能为空")
    @Pattern(regexp = EVENT_TYPE_PATTERN, message = "event_type 必须是 page_view/tool_use/copy/download 之一")
    private String eventType;
}