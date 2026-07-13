package com.panzipool.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

/**
 * 工具详情 DTO。
 *
 * <p>用于 {@code GET /api/v1/tools/{slug}} 详情接口的返回数据，包含工具完整信息：
 * 基础字段 + 冗余计数字段（use_count / like_count）+ 时间戳（created_at / updated_at）。</p>
 *
 * <p>计数直接读取 tools 表冗余字段，避免实时 COUNT 聚合。
 * SSR 阶段通过此接口获取计数，保证 HTML 含数据利于 SEO。</p>
 *
 * <p>JSON 字段使用 snake_case 命名（use_count、like_count、created_at、updated_at），
 * 与前端 API 契约一致。</p>
 */
@Schema(description = "工具详情")
@JsonPropertyOrder({"slug", "name", "category", "description", "keywords", "use_count", "like_count", "created_at", "updated_at"})
public class ToolDetailDTO {

    @Schema(description = "URL 友好标识", example = "json-formatter")
    private final String slug;

    @Schema(description = "工具显示名称", example = "JSON格式化")
    private final String name;

    @Schema(description = "分类：developer / image", example = "developer")
    private final String category;

    @Schema(description = "工具描述", example = "JSON美化、压缩、语法校验，错误定位提示")
    private final String description;

    @Schema(description = "关键词，逗号分隔", example = "json,format,beautify,minify,validate")
    private final String keywords;

    @Schema(description = "使用次数（冗余计数）", example = "12300")
    @JsonProperty("use_count")
    private final Long useCount;

    @Schema(description = "点赞次数（冗余计数）", example = "892")
    @JsonProperty("like_count")
    private final Long likeCount;

    @Schema(description = "创建时间", example = "2026-07-12T10:00:00")
    @JsonProperty("created_at")
    private final LocalDateTime createdAt;

    @Schema(description = "更新时间", example = "2026-07-12T10:00:00")
    @JsonProperty("updated_at")
    private final LocalDateTime updatedAt;

    public ToolDetailDTO(String slug, String name, String category, String description,
                         String keywords, Long useCount, Long likeCount,
                         LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.slug = slug;
        this.name = name;
        this.category = category;
        this.description = description;
        this.keywords = keywords;
        this.useCount = useCount;
        this.likeCount = likeCount;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public String getSlug() {
        return slug;
    }

    public String getName() {
        return name;
    }

    public String getCategory() {
        return category;
    }

    public String getDescription() {
        return description;
    }

    public String getKeywords() {
        return keywords;
    }

    @JsonProperty("use_count")
    public Long getUseCount() {
        return useCount;
    }

    @JsonProperty("like_count")
    public Long getLikeCount() {
        return likeCount;
    }

    @JsonProperty("created_at")
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    @JsonProperty("updated_at")
    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
