package com.panzipool.api.web.event;

import com.panzipool.api.web.event.dao.ToolEventDailyRepository;
import com.panzipool.api.web.event.dao.ToolEventLogRepository;
import com.panzipool.api.web.event.entity.ToolEventDaily;
import com.panzipool.api.web.event.entity.ToolEventLog;
import com.panzipool.api.web.event.service.impl.ScheduledTasks;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 日志保留策略定时任务测试（Task 21）。
 *
 * <p>验证 {@link ScheduledTasks#cleanupOldEventLogs()} 的删除逻辑：</p>
 * <ul>
 *   <li>超过 90 天的原始日志被删除</li>
 *   <li>90 天内的原始日志被保留</li>
 *   <li>{@code tool_event_daily} 聚合数据不受影响</li>
 *   <li>无过期日志时删除 0 条（不报错）</li>
 * </ul>
 */
@SpringBootTest
@Transactional
class ScheduledTasksRetentionTest {

    @Autowired
    private ToolEventLogRepository toolEventLogRepository;

    @Autowired
    private ToolEventDailyRepository toolEventDailyRepository;

    @Autowired
    private ScheduledTasks scheduledTasks;

    @Autowired
    private EntityManager entityManager;

    @BeforeEach
    void setUp() {
        toolEventLogRepository.deleteAllInBatch();
        toolEventDailyRepository.deleteAllInBatch();
    }

    @AfterEach
    void tearDown() {
        toolEventLogRepository.deleteAllInBatch();
        toolEventDailyRepository.deleteAllInBatch();
    }

    private ToolEventLog createEventLog(String anonId, String eventType) {
        ToolEventLog entity = new ToolEventLog();
        entity.setAnonId(anonId);
        entity.setEventType(eventType);
        return entity;
    }

    private void backdateCreatedAt(List<String> anonIds, LocalDateTime targetDate) {
        entityManager.createQuery(
                        "UPDATE ToolEventLog e SET e.createdAt = :date WHERE e.anonId IN :anonIds")
                .setParameter("date", targetDate)
                .setParameter("anonIds", anonIds)
                .executeUpdate();
        entityManager.clear();
    }

    @Test
    void cleanupOldEventLogs_deletesOldLogs_keepsRecentLogs() {
        ToolEventLog oldLog1 = createEventLog("retention-old-uuid-1", "tool_use");
        ToolEventLog oldLog2 = createEventLog("retention-old-uuid-2", "copy");
        ToolEventLog recentLog = createEventLog("retention-recent-uuid-1", "page_view");
        toolEventLogRepository.saveAll(List.of(oldLog1, oldLog2, recentLog));
        toolEventLogRepository.flush();

        LocalDateTime oldDate = LocalDateTime.now().minusDays(100);
        backdateCreatedAt(List.of("retention-old-uuid-1", "retention-old-uuid-2"), oldDate);

        assertThat(toolEventLogRepository.findAll()).hasSize(3);

        scheduledTasks.cleanupOldEventLogs();

        List<ToolEventLog> remaining = toolEventLogRepository.findAll();
        assertThat(remaining).hasSize(1);
        assertThat(remaining.get(0).getAnonId()).isEqualTo("retention-recent-uuid-1");
        assertThat(remaining.get(0).getEventType()).isEqualTo("page_view");
    }

    @Test
    void cleanupOldEventLogs_preservesDailyAggregation() {
        LocalDate oldDate = LocalDate.now().minusDays(100);
        ToolEventDaily daily = new ToolEventDaily();
        daily.setToolId(1L);
        daily.setEventDate(oldDate);
        daily.setEventType("tool_use");
        daily.setCount(42L);
        toolEventDailyRepository.save(daily);

        ToolEventLog oldLog = createEventLog("retention-daily-uuid", "tool_use");
        toolEventLogRepository.save(oldLog);
        toolEventLogRepository.flush();
        backdateCreatedAt(List.of("retention-daily-uuid"), LocalDateTime.now().minusDays(100));

        scheduledTasks.cleanupOldEventLogs();

        assertThat(toolEventLogRepository.findAll()).isEmpty();

        List<ToolEventDaily> dailyRemaining = toolEventDailyRepository.findAll();
        assertThat(dailyRemaining).hasSize(1);
        assertThat(dailyRemaining.get(0).getEventDate()).isEqualTo(oldDate);
        assertThat(dailyRemaining.get(0).getCount()).isEqualTo(42L);
    }

    @Test
    void cleanupOldEventLogs_noOldLogs_deletesNothing() {
        ToolEventLog recentLog1 = createEventLog("retention-noop-uuid-1", "tool_use");
        ToolEventLog recentLog2 = createEventLog("retention-noop-uuid-2", "copy");
        toolEventLogRepository.saveAll(List.of(recentLog1, recentLog2));
        toolEventLogRepository.flush();
        entityManager.clear();

        long countBefore = toolEventLogRepository.count();

        scheduledTasks.cleanupOldEventLogs();

        long countAfter = toolEventLogRepository.count();
        assertThat(countAfter).isEqualTo(countBefore);
        assertThat(countAfter).isEqualTo(2);
    }

    @Test
    void cleanupOldEventLogs_boundaryCondition_deletesSlightlyOver90Days() {
        ToolEventLog boundaryLog = createEventLog("retention-boundary-uuid", "tool_use");
        toolEventLogRepository.save(boundaryLog);
        toolEventLogRepository.flush();

        backdateCreatedAt(List.of("retention-boundary-uuid"), LocalDateTime.now().minusDays(91));

        assertThat(toolEventLogRepository.findAll()).hasSize(1);

        scheduledTasks.cleanupOldEventLogs();

        assertThat(toolEventLogRepository.findAll()).isEmpty();
    }

    @Test
    void cleanupOldEventLogs_emptyTable_noError() {
        assertThat(toolEventLogRepository.findAll()).isEmpty();

        scheduledTasks.cleanupOldEventLogs();

        assertThat(toolEventLogRepository.findAll()).isEmpty();
    }
}