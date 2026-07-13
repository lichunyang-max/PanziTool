package com.panzipool.api.config;

import com.panzipool.api.entity.SiteVisitorDaily;
import com.panzipool.api.entity.ToolEventDaily;
import com.panzipool.api.repository.SiteVisitorDailyRepository;
import com.panzipool.api.repository.ToolEventDailyRepository;
import com.panzipool.api.repository.ToolEventLogRepository;
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
 *   <li>对 site_visitor_daily 补充聚合 PV（若定时执行前未通过实时写入生成当日记录）</li>
 * </ul>
 * </p>
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

    /**
     * 每日凌晨 02:00 聚合前一天的原始事件日志。
     */
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
            throw e; // 让事务回滚
        }
    }

    /**
     * 每日凌晨 03:00 清理超过 90 天的原始事件日志。
     *
     * <p>数据治理策略：原始日志（{@code tool_event_logs}）增长迅速，
     * 仅保留最近 90 天用于异常排查；历史趋势数据已由每日聚合任务
     * 写入 {@code tool_event_daily} 表，聚合数据不受影响。</p>
     *
     * <p>执行时间安排在聚合任务（02:00）之后，确保当天聚合完成后再清理。</p>
     */
    @Scheduled(cron = "0 0 3 * * ?")
    @Transactional
    public void cleanupOldEventLogs() {
        // 计算过期阈值：90 天前的时刻
        LocalDateTime threshold = LocalDateTime.now().minusDays(90);
        log.info("开始清理过期事件日志: threshold={}", threshold);

        try {
            int deletedCount = toolEventLogRepository.deleteByCreatedAtBefore(threshold);
            log.info("清理过期事件日志完成: deletedCount={}, threshold={}", deletedCount, threshold);
        } catch (Exception e) {
            log.error("清理过期事件日志失败: threshold={}", threshold, e);
            throw e; // 让事务回滚
        }
    }

    /**
     * 聚合 tool_event_logs → tool_event_daily。
     *
     * <p>按 (tool_id, event_date=昨天, event_type) 分组 COUNT，
     * 使用 upsert 逻辑：已有记录则累加 count，无则 INSERT。</p>
     */
    private void aggregateToolEventDaily(LocalDate yesterday) {
        LocalDateTime startOfDay = yesterday.atStartOfDay();
        LocalDateTime endOfDay = yesterday.atTime(LocalTime.MAX);

        // 使用 JPQL 聚合查询，按 (tool_id, event_type) 分组
        // 注意：tool_id 可能为 null（page_view 事件），需在 JPQL 中以显式条件处理
        // 这里分两步：先聚合有 tool_id 的，再聚合 tool_id IS NULL 的

        // === 聚合 tool_id 非空的事件 ===
        String jpqlNonNull = """
                SELECT NEW com.panzipool.api.config.ScheduledTasks$ToolEventDailyProjection(
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

        // === 聚合 tool_id IS NULL 的事件（page_view 无工具标识） ===
        String jpqlNull = """
                SELECT NEW com.panzipool.api.config.ScheduledTasks$ToolEventDailyProjection(
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

    /**
     * Upsert tool_event_daily 记录。
     */
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

    /**
     * 聚合 site_visitor_daily。
     *
     * <p>如果实时写入已创建当日 PV 记录则跳过；
     * 否则根据 tool_event_logs 中 page_view 事件数量补充 PV。</p>
     */
    private void aggregateSiteVisitorDaily(LocalDate yesterday) {
        // 如果已有记录则跳过（实时写入已处理）
        if (siteVisitorDailyRepository.findByStatDate(yesterday).isPresent()) {
            log.debug("站点日统计记录已存在，跳过聚合: date={}", yesterday);
            return;
        }

        // 统计昨天的 page_view 事件数
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
            daily.setUv(0L); // UV 需按 anon_id 去重，MVP 暂不计算
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
