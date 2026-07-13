package com.panzipool.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * 匿名统计事件上报请求 DTO。
 *
 * <p>客户端在关键操作时触发上报，携带匿名 ID、事件类型与可选工具 slug。
 * JSON 字段名使用 snake_case（如 {@code tool_slug}、{@code anon_id}、{@code event_type}），
 * 与前端约定一致。</p>
 *
 * <p>校验规则：</p>
 * <ul>
 *   <li>{@code anon_id}：必填，标准 UUID v4 格式（8-4-4-4-12）</li>
 *   <li>{@code event_type}：必填，必须在白名单 {page_view, tool_use, copy, download} 内</li>
 *   <li>{@code tool_slug}：当 event_type 为 tool_use/copy/download 时需提供</li>
 * </ul>
 */
@Schema(description = "事件上报请求")
public class EventReportRequest {

    /** UUID v4 正则（不区分大小写，标准 8-4-4-4-12 格式） */
    private static final String UUID_PATTERN =
            "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$";

    /** 事件类型白名单正则 */
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

    // --- Getters & Setters ---

    public String getToolSlug() {
        return toolSlug;
    }

    public void setToolSlug(String toolSlug) {
        this.toolSlug = toolSlug;
    }

    public String getAnonId() {
        return anonId;
    }

    public void setAnonId(String anonId) {
        this.anonId = anonId;
    }

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }
}
