package com.panzipool.api.web.tool.dao;

import com.panzipool.api.common.QueryCriteria;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 工具查询条件。
 *
 * <p>参考 ComputeResourceQueryCriteria 的设计模式：
 * 继承 {@link QueryCriteria} 获取通用分页/排序参数，
 * 自身定义业务过滤字段（如分类筛选）。</p>
 *
 * <p>配合 {@link ToolSpec} 构建器将条件转换为 JPA {@code Specification}，
 * 实现动态查询而非硬编码 Repository 方法。</p>
 */
@Data
@EqualsAndHashCode(callSuper = true)
@Schema(description = "工具查询条件")
public class ToolQueryCriteria extends QueryCriteria {

    @Schema(description = "分类筛选：developer / image")
    private String category;
}