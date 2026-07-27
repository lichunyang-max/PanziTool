package com.panzipool.api.web.tool.dto;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

/**
 * 工具列表响应 DTO。
 */
@Schema(description = "工具列表响应")
@Data
@AllArgsConstructor
@JsonPropertyOrder({"items", "total"})
public class ToolListResponse {

    @Schema(description = "工具列表项数组")
    private List<ToolListItemDTO> items;

    @Schema(description = "满足筛选条件的工具总数（分页前）", example = "10")
    private long total;
}