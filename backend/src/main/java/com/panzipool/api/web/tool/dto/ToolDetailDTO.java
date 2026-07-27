package com.panzipool.api.web.tool.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 工具详情 DTO。
 */
@Schema(description = "工具详情")
@Data
@AllArgsConstructor
@JsonPropertyOrder({"slug", "name", "category", "description", "keywords", "use_count", "like_count", "created_at", "updated_at"})
public class ToolDetailDTO {

    @Schema(description = "URL 友好标识", example = "json-formatter")
    private String slug;

    @Schema(description = "工具显示名称", example = "JSON格式化")
    private String name;

    @Schema(description = "分类：developer / image", example = "developer")
    private String category;

    @Schema(description = "工具描述", example = "JSON美化、压缩、语法校验，错误定位提示")
    private String description;

    @Schema(description = "关键词，逗号分隔", example = "json,format,beautify,minify,validate")
    private String keywords;

    @Schema(description = "使用次数（冗余计数）", example = "12300")
    @JsonProperty("use_count")
    private Long useCount;

    @Schema(description = "点赞次数（冗余计数）", example = "892")
    @JsonProperty("like_count")
    private Long likeCount;

    @Schema(description = "创建时间", example = "2026-07-12T10:00:00")
    @JsonProperty("created_at")
    private LocalDateTime createdAt;

    @Schema(description = "更新时间", example = "2026-07-12T10:00:00")
    @JsonProperty("updated_at")
    private LocalDateTime updatedAt;
}