package com.panzipool.api.web.tool.dao;

import com.panzipool.api.web.tool.entity.Tool;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * 工具元数据 Repository（tools 表）。
 *
 * <p>继承 {@link JpaSpecificationExecutor} 支持动态条件查询（配合 {@link ToolSpec}）。</p>
 */
@Repository
public interface ToolRepository extends JpaRepository<Tool, Long>, JpaSpecificationExecutor<Tool> {

    /**
     * 按 slug 查询工具。
     */
    Optional<Tool> findBySlug(String slug);

    /**
     * 原子递增点赞计数（{@code like_count = like_count + 1}）。
     *
     * <p>使用 bulk UPDATE 保证并发安全，避免 "读-改-写" 竞态。
     * 需在 {@code @Transactional} 上下文中调用。</p>
     *
     * @param id 工具 ID
     * @return 受影响行数（正常为 1，0 表示工具不存在）
     */
    @Modifying
    @Query("UPDATE Tool t SET t.likeCount = t.likeCount + 1 WHERE t.id = :id")
    int incrementLikeCount(@Param("id") Long id);

    /**
     * 原子递增使用计数（{@code use_count = use_count + 1}）。
     *
     * <p>用于事件上报时同步更新工具使用次数。使用 bulk UPDATE 保证并发安全。</p>
     *
     * @param id 工具 ID
     * @return 受影响行数（正常为 1，0 表示工具不存在）
     */
    @Modifying
    @Query("UPDATE Tool t SET t.useCount = t.useCount + 1 WHERE t.id = :id")
    int incrementUseCount(@Param("id") Long id);
}