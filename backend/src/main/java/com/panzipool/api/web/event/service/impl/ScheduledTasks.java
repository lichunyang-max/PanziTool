package com.panzipool.api.web.event.service.impl;

import com.panzipool.api.web.event.dao.SiteVisitorDailyRepository;
import com.panzipool.api.web.event.dao.ToolEventDailyRepository;
import com.panzipool.api.web.event.dao.ToolEventLogRepository;
import com.panzipool.api.web.event.entity.SiteVisitorDaily;
import com.panzipool.api.web.event.entity.ToolEventDaily;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

/**
 * 定时任务：每日聚合事件日志到统计表。
 *
 * <p>每天凌晨 02:00 执行，聚合前一天的 tool_event_logs 原始日志：
 * <ul>
 *   <li>按 {@code (tool_id, event_date, event_type)} 分组 COUNT</li>
 *   <li>upsert 到 tool_event_daily 表</li>
 *   <li>对 site_visitor_daily 补充聚合 PV</li>
 * </ul>
 * </p>
 *
 * <p>每天凌晨 03:00 清理超过 90 天的原始事件日志。</p>
 */
@Component
public class ScheduledTasks {

    private static final Logger log = LoggerFactory.getLogger(ScheduledTasks.class);

    private final ToolEventLogRepository toolEventLogRepository;
    private final ToolEventDailyRepository toolEventDailyRepository;
    private final SiteVisitorDailyRepository siteVisitorDailyRepository;
    private final EntityManager entityManager;

    public ScheduledTasks(ToolEventLogRepository toolEventLogRepository,
                          ToolEventDailyRepository toolEventDailyRepository,
                          SiteVisitorDailyRepository siteVisitorDailyRepository,
                          EntityManager entityManager) {
        this.toolEventLogRepository = toolEventLogRepository;
        this.toolEventDailyRepository = toolEventDailyRepository;
        this.siteVisitorDailyRepository = siteVisitorDailyRepository;
        this.entityManager = entityManager;
    }

    @Scheduled(cron = "0 0 2 * * ?")
    @Transactional
    public void aggregateDailyEvents() {
        LocalDate yesterday = LocalDate.now().minusDays(1);
        log.info("开始聚合事件日志: date={}", yesterday);

        try {
            aggregateToolEventDaily(yesterday);
            aggregateSiteVisitorDaily(yesterday);
            log.info("事件日志聚合完成: date={}", yesterday);
        } catch (Exception e) {
            log.error("事件日志聚合失败: date={}", yesterday, e);
            throw e;
        }
    }

    @Scheduled(cron = "0 0 3 * * ?")
    @Transactional
    public void cleanupOldEventLogs() {
        LocalDateTime threshold = LocalDateTime.now().minusDays(90);
        log.info("开始清理过期事件日志: threshold={}", threshold);

        try {
            int deletedCount = toolEventLogRepository.deleteByCreatedAtBefore(threshold);
            log.info("清理过期事件日志完成: deletedCount={}, threshold={}", deletedCount, threshold);
        } catch (Exception e) {
            log.error("清理过期事件日志失败: threshold={}", threshold, e);
            throw e;
        }
    }

    private void aggregateToolEventDaily(LocalDate yesterday) {
        LocalDateTime startOfDay = yesterday.atStartOfDay();
        LocalDateTime endOfDay = yesterday.atTime(LocalTime.MAX);

        // 聚合 tool_id 非空的事件
        String jpqlNonNull = """
                SELECT NEW com.panzipool.api.web.event.service.impl.ScheduledTasks$ToolEventDailyProjection(
                    e.toolId, e.eventType, CAST(COUNT(e) AS long))
                FROM ToolEventLog e
                WHERE e.createdAt >= :startTime
                  AND e.createdAt < :endTime
                  AND e.toolId IS NOT NULL
                GROUP BY e.toolId, e.eventType
                """;

        TypedQuery<ToolEventDailyProjection> queryNonNull = entityManager.createQuery(
                jpqlNonNull, ToolEventDailyProjection.class);
        queryNonNull.setParameter("startTime", startOfDay);
        queryNonNull.setParameter("endTime", endOfDay);

        List<ToolEventDailyProjection> results = queryNonNull.getResultList();
        for (ToolEventDailyProjection row : results) {
            upsertToolEventDaily(row.toolId, yesterday, row.eventType, row.count);
        }

        // 聚合 tool_id IS NULL 的事件（page_view 无工具标识）
        String jpqlNull = """
                SELECT NEW com.panzipool.api.web.event.service.impl.ScheduledTasks$ToolEventDailyProjection(
                    NULL, e.eventType, CAST(COUNT(e) AS long))
                FROM ToolEventLog e
                WHERE e.createdAt >= :startTime
                  AND e.createdAt < :endTime
                  AND e.toolId IS NULL
                GROUP BY e.eventType
                """;

        TypedQuery<ToolEventDailyProjection> queryNull = entityManager.createQuery(
                jpqlNull, ToolEventDailyProjection.class);
        queryNull.setParameter("startTime", startOfDay);
        queryNull.setParameter("endTime", endOfDay);

        List<ToolEventDailyProjection> nullResults = queryNull.getResultList();
        for (ToolEventDailyProjection row : nullResults) {
            upsertToolEventDaily(null, yesterday, row.eventType, row.count);
        }
    }

    private void upsertToolEventDaily(Long toolId, LocalDate eventDate, String eventType, long count) {
        toolEventDailyRepository
                .findByToolIdAndEventDateAndEventType(toolId, eventDate, eventType)
                .ifPresentOrElse(
                        existing -> {
                            existing.setCount(existing.getCount() + count);
                            toolEventDailyRepository.save(existing);
                        },
                        () -> {
                            ToolEventDaily daily = new ToolEventDaily();
                            daily.setToolId(toolId);
                            daily.setEventDate(eventDate);
                            daily.setEventType(eventType);
                            daily.setCount(count);
                            toolEventDailyRepository.save(daily);
                        });
    }

    private void aggregateSiteVisitorDaily(LocalDate yesterday) {
        if (siteVisitorDailyRepository.findByStatDate(yesterday).isPresent()) {
            log.debug("站点日统计记录已存在，跳过聚合: date={}", yesterday);
            return;
        }

        LocalDateTime startOfDay = yesterday.atStartOfDay();
        LocalDateTime endOfDay = yesterday.atTime(LocalTime.MAX);

        String countJpql = """
                SELECT COUNT(e) FROM ToolEventLog e
                WHERE e.createdAt >= :startTime
                  AND e.createdAt < :endTime
                  AND e.eventType = 'page_view'
                """;
        Long pvCount = entityManager.createQuery(countJpql, Long.class)
                .setParameter("startTime", startOfDay)
                .setParameter("endTime", endOfDay)
                .getSingleResult();

        if (pvCount != null && pvCount > 0) {
            SiteVisitorDaily daily = new SiteVisitorDaily();
            daily.setStatDate(yesterday);
            daily.setPv(pvCount);
            daily.setUv(0L);
            siteVisitorDailyRepository.save(daily);
            log.info("补充站点日统计: date={}, pv={}", yesterday, pvCount);
        }
    }

    /**
     * JPQL 投影 DTO，用于聚合查询结果映射。
     */
    public static class ToolEventDailyProjection {
        Long toolId;
        String eventType;
        long count;

        public ToolEventDailyProjection(Long toolId, String eventType, long count) {
            this.toolId = toolId;
            this.eventType = eventType;
            this.count = count;
        }
    }
}