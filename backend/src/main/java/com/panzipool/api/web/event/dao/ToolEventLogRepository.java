package com.panzipool.api.web.event.dao;

import com.panzipool.api.web.event.entity.ToolEventLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

/**
 * 原始事件日志 Repository（tool_event_logs 表）。
 *
 * <p>提供事件日志的持久化操作。聚合查询由定时任务完成。</p>
 */
@Repository
public interface ToolEventLogRepository extends JpaRepository<ToolEventLog, Long> {

    /**
     * 批量删除创建时间早于指定阈值的原始事件日志。
     *
     * <p>使用 JPQL 批量 DELETE，比 Spring Data 的派生删除方法
     *（先 SELECT 再逐条删除）更高效，适合定期清理大量历史数据。</p>
     */
    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM ToolEventLog e WHERE e.createdAt < :threshold")
    int deleteByCreatedAtBefore(@Param("threshold") LocalDateTime threshold);
}