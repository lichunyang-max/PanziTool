package com.panzipool.api.common;

import java.util.List;

/**
 * Entity ↔ DTO 映射基础接口。
 *
 * <p>各业务模块的 Mapper 继承此接口，配合 MapStruct {@code @Mapper} 注解，
 * 编译期自动生成转换实现，消除手工 toDto / toEntity 样板代码。</p>
 *
 * @param <D> DTO 类型
 * @param <E> Entity 类型
 */
public interface BaseMapper<D, E> {

    /**
     * Entity → DTO 转换。
     */
    D toDto(E entity);

    /**
     * DTO → Entity 转换。
     */
    E toEntity(D dto);

    /**
     * Entity 列表 → DTO 列表转换。
     */
    List<D> toDtoList(List<E> entities);
}