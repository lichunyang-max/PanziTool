package com.panzipool.api.web.event.dao;

import com.panzipool.api.web.event.entity.ToolEventDaily;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

/**
 * 按天聚合统计 Repository（tool_event_daily 表）。
 */
@Repository
public interface ToolEventDailyRepository extends JpaRepository<ToolEventDaily, Long> {

    Optional<ToolEventDaily> findByToolIdAndEventDateAndEventType(Long toolId, LocalDate eventDate, String eventType);
}