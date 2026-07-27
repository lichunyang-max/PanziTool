package com.panzipool.api.web.tool.dao;

import com.panzipool.api.web.tool.entity.ToolLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;

/**
 * 点赞记录 Repository（tool_likes 表）。
 *
 * <p>核心防刷能力：通过 {@link #existsByToolIdAndAnonIdAndLikeDate} 检查
 * (tool_id, anon_id, like_date) 是否已存在，配合数据库唯一约束
 * {@code uk_tool_likes_tool_anon_date} 确保同一匿名用户对同一工具每个自然天仅能点赞一次。</p>
 */
@Repository
public interface ToolLikeRepository extends JpaRepository<ToolLike, Long> {

    /**
     * 检查指定工具是否已被指定匿名用户在指定自然天点赞。
     *
     * <p>这是防刷的第一道检查（乐观检查）；并发场景下数据库唯一约束作为最终兜底。</p>
     *
     * @param toolId   工具 ID
     * @param anonId   匿名用户 ID
     * @param likeDate 点赞所在自然天
     * @return 已存在返回 true
     */
    boolean existsByToolIdAndAnonIdAndLikeDate(Long toolId, String anonId, LocalDate likeDate);

    /**
     * 统计指定工具的点赞总数。
     *
     * <p>可用于校验冗余计数字段 {@code tools.like_count} 的准确性。</p>
     *
     * @param toolId 工具 ID
     * @return 点赞总数
     */
    long countByToolId(Long toolId);
}