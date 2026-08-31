package com.panzipool.api.web.resource.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 创建/更新资源请求 DTO。
 *
 * <p>资源三个核心字段：名称、链接、图片（图片可空，前端展示默认图标）。</p>
 */
@Schema(description = "资源创建/更新请求")
@Data
public class ResourceItemRequest {

    @Schema(description = "所属目录 ID", example = "2", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotNull(message = "所属目录不能为空")
    private Long categoryId;

    @Schema(description = "资源名称", example = "简历模板", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "资源名称不能为空")
    @Size(max = 200, message = "资源名称不能超过 200 字")
    private String name;

    @Schema(description = "跳转链接", example = "https://example.com/resume", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "资源链接不能为空")
    @Size(max = 500, message = "资源链接不能超过 500 字")
    private String url;

    @Schema(description = "图标图片 URL（MinIO），可空表示使用默认图标")
    @Size(max = 500, message = "图片 URL 不能超过 500 字")
    private String image;

    @Schema(description = "排序号，越小越靠前，默认 0", example = "0")
    private Integer sortOrder = 0;
}
