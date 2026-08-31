package com.panzipool.api.web.resource.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 创建/更新目录请求 DTO。
 */
@Schema(description = "目录创建/更新请求")
@Data
public class CategoryRequest {

    @Schema(description = "目录名称", example = "word", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "目录名称不能为空")
    @Size(max = 100, message = "目录名称不能超过 100 字")
    private String name;

    @Schema(description = "父目录 ID，空表示创建一级目录", example = "1")
    private Long parentId;

    @Schema(description = "排序号，越小越靠前，默认 0", example = "0")
    private Integer sortOrder = 0;
}
