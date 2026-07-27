package com.panzipool.api.web.tool.service.impl;

import com.panzipool.api.common.ApiConstants;
import com.panzipool.api.common.BusinessException;
import com.panzipool.api.web.tool.dao.ToolMapper;
import com.panzipool.api.web.tool.dao.ToolQueryCriteria;
import com.panzipool.api.web.tool.dao.ToolRepository;
import com.panzipool.api.web.tool.dao.ToolSpec;
import com.panzipool.api.web.tool.dto.ToolDetailDTO;
import com.panzipool.api.web.tool.dto.ToolListItemDTO;
import com.panzipool.api.web.tool.dto.ToolListResponse;
import com.panzipool.api.web.tool.entity.Tool;
import com.panzipool.api.web.tool.service.ToolService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 工具元数据与计数查询服务实现。
 *
 * <p>使用 {@link ToolSpec} + {@link ToolQueryCriteria} 实现动态查询，
 * 使用 {@link ToolMapper} 自动完成 Entity→DTO 映射，
 * 消除手工 toDto 样板代码。</p>
 */
@Service
@RequiredArgsConstructor
public class ToolServiceImpl implements ToolService {

    private static final Logger log = LoggerFactory.getLogger(ToolServiceImpl.class);

    /** 默认返回数量上限 */
    private static final int DEFAULT_LIMIT = 50;

    private final ToolRepository toolRepository;
    private final ToolMapper toolMapper;

    @Override
    public ToolListResponse getTools(String category, String sort, Integer limit, Integer offset) {
        // 构建查询条件
        ToolQueryCriteria criteria = new ToolQueryCriteria();
        criteria.setCategory(category);
        criteria.setSort(sort);

        // 通过 Specification 动态查询 + 排序
        Sort jpaSort = resolveSort(sort);
        List<Tool> tools = toolRepository.findAll(ToolSpec.of(criteria), jpaSort);

        // 分页参数处理
        int off = (offset != null && offset > 0) ? offset : 0;
        int lim = (limit != null && limit > 0) ? limit : DEFAULT_LIMIT;

        // 应用 offset / limit
        int fromIndex = Math.min(off, tools.size());
        int toIndex = Math.min(off + lim, tools.size());
        List<Tool> paged = tools.subList(fromIndex, toIndex);

        // MapStruct 自动映射 Entity → DTO
        List<ToolListItemDTO> items = toolMapper.toListItemDtoList(paged);

        log.debug("查询工具列表: category={}, sort={}, limit={}, offset={}, total={}, returned={}",
                category, sort, lim, off, tools.size(), items.size());

        return new ToolListResponse(items, tools.size());
    }

    @Override
    public ToolDetailDTO getToolBySlug(String slug) {
        Tool tool = toolRepository.findBySlug(slug)
                .orElseThrow(() -> new BusinessException(
                        ApiConstants.CODE_NOT_FOUND, "工具不存在", HttpStatus.NOT_FOUND));

        if (!Boolean.TRUE.equals(tool.getEnabled())) {
            throw new BusinessException(
                    ApiConstants.CODE_NOT_FOUND, "工具不存在", HttpStatus.NOT_FOUND);
        }

        log.debug("查询工具详情: slug={}, useCount={}, likeCount={}",
                slug, tool.getUseCount(), tool.getLikeCount());

        // MapStruct 自动映射 Entity → DetailDTO
        return toolMapper.toDto(tool);
    }

    /**
     * 解析排序参数为 Spring Data JPA Sort。
     */
    private Sort resolveSort(String sort) {
        if ("latest".equalsIgnoreCase(sort)) {
            return Sort.by(Sort.Direction.DESC, "createdAt");
        }
        return Sort.by(Sort.Direction.DESC, "useCount");
    }
}