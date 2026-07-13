package com.panzipool.api.repository;

import com.panzipool.api.entity.ToolEventLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

/**
 * 原始事件日志 Repository（tool_event_logs 表）。
 *
 * <p>提供事件日志的持久化操作。聚合查询由定时任务
 * {@link com.panzipool.api.config.ScheduledTasks} 完成。</p>
 */
@Repository
public interface ToolEventLogRepository extends JpaRepository<ToolEventLog, Long> {

    /**
     * 批量删除创建时间早于指定阈值的原始事件日志。
     *
     * <p>使用 JPQL 批量 DELETE，比 Spring Data 的派生删除方法
     *（先 SELECT 再逐条删除）更高效，适合定期清理大量历史数据。</p>
     *
     * <p>注意：此方法仅清理 {@code tool_event_logs} 原始日志表，
     * 不影响 {@code tool_event_daily} 聚合统计表。</p>
     *
     * @param threshold 过期阈值，删除 {@code createdAt < threshold} 的记录
     * @return 被删除的记录数
     */
    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM ToolEventLog e WHERE e.createdAt < :threshold")
    int deleteByCreatedAtBefore(@Param("threshold") LocalDateTime threshold);
}
