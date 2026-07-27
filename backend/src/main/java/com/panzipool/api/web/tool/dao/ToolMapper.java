package com.panzipool.api.web.tool.dao;

import com.panzipool.api.common.BaseMapper;
import com.panzipool.api.web.tool.dto.ToolDetailDTO;
import com.panzipool.api.web.tool.dto.ToolListItemDTO;
import com.panzipool.api.web.tool.entity.Tool;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

import java.util.List;

/**
 * Tool 实体 ↔ DTO 映射 Mapper。
 *
 * <p>MapStruct 编译期自动生成实现，字段名一致自动映射，
 * 无需手工编写 toDto / toEntity 方法。</p>
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface ToolMapper extends BaseMapper<ToolDetailDTO, Tool> {

    /**
     * Entity → 列表项 DTO（仅映射公共字段，不含时间戳）。
     */
    ToolListItemDTO toListItemDto(Tool entity);

    /**
     * Entity 列表 → 列表项 DTO 列表。
     */
    List<ToolListItemDTO> toListItemDtoList(List<Tool> entities);
}