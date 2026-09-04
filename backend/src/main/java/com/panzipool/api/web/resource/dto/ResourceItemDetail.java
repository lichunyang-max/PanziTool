package com.panzipool.api.web.resource.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.List;

/**
 * 资源详情 DTO（前台 /resources/items/{id} 响应结构）。
 */
@Data
@Schema(description = "资源详情")
public class ResourceItemDetail {

    @Schema(description = "资源 ID")
    private Long id;

    @Schema(description = "所属目录 ID")
    private Long categoryId;

    @Schema(description = "所属目录名称（如：考研考公）")
    private String categoryName;

    @Schema(description = "所属一级目录名称（如：学习资料文档）")
    private String rootCategoryName;

    @Schema(description = "资源名称", example = "简历模板")
    private String name;

    @Schema(description = "跳转链接")
    private String url;

    @Schema(description = "图标图片 URL，空表示使用默认图标")
    private String image;

    @Schema(description = "资源图标（emoji），有值时优先于图片展示")
    private String icon;

    @Schema(description = "标签列表（最多 2 个）")
    private List<String> tags;

    @Schema(description = "资源描述")
    private String description;

    @Schema(description = "下载次数")
    private Long downloadCount;

    @Schema(description = "点赞次数")
    private Long likeCount;
}
