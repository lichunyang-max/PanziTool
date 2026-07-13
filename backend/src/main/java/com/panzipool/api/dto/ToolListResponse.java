package com.panzipool.api.dto;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

/**
 * 工具列表响应 DTO。
 *
 * <p>用于 {@code GET /api/v1/tools} 列表接口的返回数据信封内层：
 * {@code { "items": [...], "total": N }}。</p>
 *
 * <p>{@code total} 表示满足筛选条件的工具总数（分页前），
 * {@code items} 为当前页的工具列表项。</p>
 */
@Schema(description = "工具列表响应")
@JsonPropertyOrder({"items", "total"})
public class ToolListResponse {

    @Schema(description = "工具列表项数组")
    private final List<ToolListItemDTO> items;

    @Schema(description = "满足筛选条件的工具总数（分页前）", example = "10")
    private final long total;

    public ToolListResponse(List<ToolListItemDTO> items, long total) {
        this.items = items;
        this.total = total;
    }

    public List<ToolListItemDTO> getItems() {
        return items;
    }

    public long getTotal() {
        return total;
    }
}
