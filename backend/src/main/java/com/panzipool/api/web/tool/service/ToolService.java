package com.panzipool.api.web.tool.service;

import com.panzipool.api.web.tool.dto.ToolDetailDTO;
import com.panzipool.api.web.tool.dto.ToolListResponse;

/**
 * 工具元数据与计数查询服务接口。
 */
public interface ToolService {

    /**
     * 查询工具列表（支持分类筛选、排序、分页）。
     *
     * @param category 分类筛选（developer / image），null 或空则返回全部
     * @param sort     排序方式（popular / latest），null 则默认 popular
     * @param limit    返回数量限制，null 或 <=0 则默认 50
     * @param offset   分页偏移，null 或 <0 则默认 0
     * @return 工具列表响应（items + total）
     */
    ToolListResponse getTools(String category, String sort, Integer limit, Integer offset);

    /**
     * 按 slug 查询工具详情（含 use_count、like_count 冗余计数）。
     *
     * @param slug 工具 URL 标识
     * @return 工具详情 DTO
     */
    ToolDetailDTO getToolBySlug(String slug);
}