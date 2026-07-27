package com.panzipool.api.web.tool.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

/**
 * 点赞请求 DTO。
 */
@Schema(description = "点赞请求")
@Data
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
}