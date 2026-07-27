package com.panzipool.api.common;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 * 查询条件基类。
 *
 * <p>参考 ComputeResourceQueryCriteria 的 DateTypeQueryCriteria 基类设计，
 * 提供通用的分页与排序参数。各业务模块的 QueryCriteria 继承此类后，
 * 在 Specification 构建器中解析为 JPA 动态查询条件。</p>
 */
@Data
@Schema(description = "查询条件基类")
public abstract class QueryCriteria {

    @Schema(description = "排序方式", example = "popular")
    private String sort;

    @Schema(description = "返回数量限制", example = "50")
    private Integer limit;

    @Schema(description = "分页偏移", example = "0")
    private Integer offset;
}