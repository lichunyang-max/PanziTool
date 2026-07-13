package com.panzipool.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * 点赞请求 DTO。
 *
 * <p>客户端通过 localStorage 生成匿名 UUID（anon_id），后端基于 (tool_id, anon_id) 唯一约束
 * 限制同一匿名用户对同一工具仅能点赞一次。</p>
 *
 * <p>JSON 字段名为 {@code anon_id}（snake_case），与前端约定一致。</p>
 */
@Schema(description = "点赞请求")
public class LikeRequest {

    /** UUID v4 正则（不区分大小写，标准 8-4-4-4-12 格式） */
    private static final String UUID_PATTERN =
            "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$";

    @Schema(description = "匿名用户 ID（UUID v4，客户端 localStorage 生成）",
            example = "550e8400-e29b-41d4-a716-446655440000", requiredMode = Schema.RequiredMode.REQUIRED)
    @JsonProperty("anon_id")
    @NotBlank(message = "anon_id 不能为空")
    @Pattern(regexp = UUID_PATTERN, message = "anon_id 格式不正确，应为标准 UUID（如 550e8400-e29b-41d4-a716-446655440000）")
    private String anonId;

    public String getAnonId() {
        return anonId;
    }

    public void setAnonId(String anonId) {
        this.anonId = anonId;
    }
}
