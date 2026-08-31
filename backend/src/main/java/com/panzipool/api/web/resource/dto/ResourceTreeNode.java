package com.panzipool.api.web.resource.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * 资源树节点 DTO（前台 /resources/tree 响应结构）。
 *
 * <p>两级层级：一级目录（如"办公文档模板"）携带 {@code children} 二级目录，
 * 每个目录节点可携带其直属资源 {@code items}（通常挂在二级目录下）。</p>
 */
@Data
public class ResourceTreeNode {

    @Schema(description = "目录 ID")
    private Long id;

    @Schema(description = "目录名称", example = "word")
    private String name;

    @Schema(description = "父目录 ID，一级目录为 null")
    private Long parentId;

    @Schema(description = "排序号")
    private Integer sortOrder;

    @Schema(description = "子目录列表（仅一级目录有）")
    private List<ResourceTreeNode> children = new ArrayList<>();

    @Schema(description = "该目录下的资源列表")
    private List<ResourceItemVO> items = new ArrayList<>();

    /**
     * 资源条目视图对象。
     */
    @Data
    public static class ResourceItemVO {

        @Schema(description = "资源 ID")
        private Long id;

        @Schema(description = "资源名称", example = "简历模板")
        private String name;

        @Schema(description = "跳转链接")
        private String url;

        @Schema(description = "图标 URL，空表示使用默认图标")
        private String image;

        @Schema(description = "排序号")
        private Integer sortOrder;
    }
}
