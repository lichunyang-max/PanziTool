package com.panzipool.api.service;

import com.panzipool.api.common.ApiConstants;
import com.panzipool.api.common.BusinessException;
import com.panzipool.api.dto.ToolDetailDTO;
import com.panzipool.api.dto.ToolListItemDTO;
import com.panzipool.api.dto.ToolListResponse;
import com.panzipool.api.entity.Tool;
import com.panzipool.api.repository.ToolRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 工具元数据与计数查询服务。
 *
 * <p>提供工具列表查询（支持分类筛选、热门/最新排序、分页）与工具详情查询。
 * 计数查询直接读取 tools 表冗余计数字段（use_count / like_count），
 * 避免实时 COUNT 聚合，保证查询性能。</p>
 *
 * <p>排序策略：
 * <ul>
 *   <li>{@code popular}（默认）：按 use_count 降序，配合 (category, use_count) 复合索引</li>
 *   <li>{@code latest}：按 created_at 降序</li>
 * </ul>
 * </p>
 */
@Service
public class ToolService {

    private static final Logger log = LoggerFactory.getLogger(ToolService.class);

    /** 默认返回数量上限 */
    private static final int DEFAULT_LIMIT = 50;

    private final ToolRepository toolRepository;

    public ToolService(ToolRepository toolRepository) {
        this.toolRepository = toolRepository;
    }

    /**
     * 查询工具列表（支持分类筛选、排序、分页）。
     *
     * <p>仅返回 enabled=true 的工具。total 为满足筛选条件的总数（分页前）。</p>
     *
     * @param category 分类筛选（developer / image），null 或空则返回全部
     * @param sort     排序方式（popular / latest），null 则默认 popular
     * @param limit    返回数量限制，null 或 <=0 则默认 50
     * @param offset   分页偏移，null 或 <0 则默认 0
     * @return 工具列表响应（items + total）
     */
    public ToolListResponse getTools(String category, String sort, Integer limit, Integer offset) {
        Sort jpaSort = resolveSort(sort);

        // 查询已启用的工具（按分类筛选 + 排序）
        List<Tool> tools;
        if (category != null && !category.isBlank()) {
            tools = toolRepository.findByCategoryAndEnabledTrue(category.trim(), jpaSort);
        } else {
            tools = toolRepository.findByEnabledTrue(jpaSort);
        }

        // 分页参数处理
        int off = (offset != null && offset > 0) ? offset : 0;
        int lim = (limit != null && limit > 0) ? limit : DEFAULT_LIMIT;

        // 应用 offset / limit（subList）
        int fromIndex = Math.min(off, tools.size());
        int toIndex = Math.min(off + lim, tools.size());
        List<Tool> paged = tools.subList(fromIndex, toIndex);

        // 转换为 DTO
        List<ToolListItemDTO> items = paged.stream()
                .map(this::toListItemDTO)
                .collect(Collectors.toList());

        log.debug("查询工具列表: category={}, sort={}, limit={}, offset={}, total={}, returned={}",
                category, sort, lim, off, tools.size(), items.size());

        return new ToolListResponse(items, tools.size());
    }

    /**
     * 按 slug 查询工具详情（含 use_count、like_count 冗余计数）。
     *
     * @param slug 工具 URL 标识
     * @return 工具详情 DTO
     * @throws BusinessException 当 slug 不存在或工具未启用时，抛出 code=404 的业务异常
     */
    public ToolDetailDTO getToolBySlug(String slug) {
        Tool tool = toolRepository.findBySlug(slug)
                .orElseThrow(() -> new BusinessException(
                        ApiConstants.CODE_NOT_FOUND, "工具不存在", HttpStatus.NOT_FOUND));

        // 未启用的工具对用户不可见，视为不存在
        if (!Boolean.TRUE.equals(tool.getEnabled())) {
            throw new BusinessException(
                    ApiConstants.CODE_NOT_FOUND, "工具不存在", HttpStatus.NOT_FOUND);
        }

        log.debug("查询工具详情: slug={}, useCount={}, likeCount={}",
                slug, tool.getUseCount(), tool.getLikeCount());

        return toDetailDTO(tool);
    }

    /**
     * 解析排序参数为 Spring Data JPA Sort。
     *
     * @param sort 排序方式（popular / latest），null 默认 popular
     * @return JPA Sort 对象
     */
    private Sort resolveSort(String sort) {
        if ("latest".equalsIgnoreCase(sort)) {
            return Sort.by(Sort.Direction.DESC, "createdAt");
        }
        // 默认 popular：按 use_count 降序，配合 (category, use_count) 复合索引
        return Sort.by(Sort.Direction.DESC, "useCount");
    }

    /**
     * Tool 实体 → 列表项 DTO 转换。
     */
    private ToolListItemDTO toListItemDTO(Tool tool) {
        return new ToolListItemDTO(
                tool.getSlug(),
                tool.getName(),
                tool.getCategory(),
                tool.getDescription(),
                tool.getKeywords(),
                tool.getUseCount(),
                tool.getLikeCount()
        );
    }

    /**
     * Tool 实体 → 详情 DTO 转换。
     */
    private ToolDetailDTO toDetailDTO(Tool tool) {
        return new ToolDetailDTO(
                tool.getSlug(),
                tool.getName(),
                tool.getCategory(),
                tool.getDescription(),
                tool.getKeywords(),
                tool.getUseCount(),
                tool.getLikeCount(),
                tool.getCreatedAt(),
                tool.getUpdatedAt()
        );
    }
}
