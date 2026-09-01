package com.panzipool.api.web.resource.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

/**
 * 资源点赞请求 DTO。
 *
 * <p>客户端通过 localStorage 生成匿名 UUID（anon_id），后端基于
 * {@code (item_id, anon_id)} 唯一约束限制同一匿名用户仅能点赞一次。</p>
 */
@Schema(description = "资源点赞请求")
@Data
public class LikeRequest {

    /** UUID v4 正则（不区分大小写，标准 8-4-4-4-12 格式） */
    private static final String UUID_PATTERN =
            "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$";

    @Schema(description = "匿名用户 ID（UUID v4，客户端 localStorage 生成）",
            example = "550e8400-e29b-41d4-a716-446655440000", requiredMode = Schema.RequiredMode.REQUIRED)
    @JsonProperty("anon_id")
    @NotBlank(message = "anon_id 不能为空")
    @Pattern(regexp = UUID_PATTERN, message = "anon_id 格式不正确，应为标准 UUID")
    private String anonId;
}
