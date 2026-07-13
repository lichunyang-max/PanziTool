package com.panzipool.api.repository;

import com.panzipool.api.entity.ToolEventDaily;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

/**
 * 按天聚合统计 Repository（tool_event_daily 表）。
 *
 * <p>提供聚合统计的持久化操作，支持按 (tool_id, event_date, event_type) 查询与 upsert。</p>
 */
@Repository
public interface ToolEventDailyRepository extends JpaRepository<ToolEventDaily, Long> {

    /**
     * 按 (tool_id, event_date, event_type) 查询聚合记录。
     *
     * @param toolId    工具 ID（page_view 事件为 null）
     * @param eventDate 事件日期
     * @param eventType 事件类型
     * @return 聚合记录（可能为空）
     */
    Optional<ToolEventDaily> findByToolIdAndEventDateAndEventType(Long toolId, LocalDate eventDate, String eventType);
}
