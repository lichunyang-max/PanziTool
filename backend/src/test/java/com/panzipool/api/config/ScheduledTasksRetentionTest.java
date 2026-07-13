package com.panzipool.api.config;

import com.panzipool.api.entity.ToolEventDaily;
import com.panzipool.api.entity.ToolEventLog;
import com.panzipool.api.repository.ToolEventDailyRepository;
import com.panzipool.api.repository.ToolEventLogRepository;
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
 *
 * <p>使用默认 profile（H2 内存库 + Flyway），测试数据在 @BeforeEach 创建、
 * @AfterEach 清理，不影响其他测试类。</p>
 *
 * <p>由于 {@code @CreatedDate} 在 save 时自动填充为当前时间，
 * 测试通过 JPQL UPDATE 将部分记录的 {@code createdAt} 回溯到 100 天前，
 * 模拟过期日志。</p>
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

    /**
     * 辅助方法：创建一条事件日志实体（未持久化）。
     */
    private ToolEventLog createEventLog(String anonId, String eventType) {
        ToolEventLog entity = new ToolEventLog();
        entity.setAnonId(anonId);
        entity.setEventType(eventType);
        return entity;
    }

    /**
     * 辅助方法：将指定 anonId 的日志记录的 createdAt 回溯到指定时间。
     * 通过 JPQL UPDATE 直接修改数据库，绕过 @CreatedDate 审计。
     */
    private void backdateCreatedAt(List<String> anonIds, LocalDateTime targetDate) {
        entityManager.createQuery(
                        "UPDATE ToolEventLog e SET e.createdAt = :date WHERE e.anonId IN :anonIds")
                .setParameter("date", targetDate)
                .setParameter("anonIds", anonIds)
                .executeUpdate();
        // 清除持久化上下文，确保后续读取从数据库获取最新数据
        entityManager.clear();
    }

    // =========================================================================
    // 场景一：清理过期日志，保留近期日志
    // =========================================================================

    @Test
    void cleanupOldEventLogs_deletesOldLogs_keepsRecentLogs() {
        // 创建 3 条日志：2 条将被回溯为过期，1 条保持近期
        ToolEventLog oldLog1 = createEventLog("retention-old-uuid-1", "tool_use");
        ToolEventLog oldLog2 = createEventLog("retention-old-uuid-2", "copy");
        ToolEventLog recentLog = createEventLog("retention-recent-uuid-1", "page_view");
        toolEventLogRepository.saveAll(List.of(oldLog1, oldLog2, recentLog));
        toolEventLogRepository.flush();

        // 将前两条日志回溯到 100 天前（超过 90 天保留期）
        LocalDateTime oldDate = LocalDateTime.now().minusDays(100);
        backdateCreatedAt(List.of("retention-old-uuid-1", "retention-old-uuid-2"), oldDate);

        // 确认清理前有 3 条日志
        assertThat(toolEventLogRepository.findAll()).hasSize(3);

        // 执行清理
        scheduledTasks.cleanupOldEventLogs();

        // 验证：仅剩 1 条近期日志
        List<ToolEventLog> remaining = toolEventLogRepository.findAll();
        assertThat(remaining).hasSize(1);
        assertThat(remaining.get(0).getAnonId()).isEqualTo("retention-recent-uuid-1");
        assertThat(remaining.get(0).getEventType()).isEqualTo("page_view");
    }

    // =========================================================================
    // 场景二：tool_event_daily 聚合数据不受清理影响
    // =========================================================================

    @Test
    void cleanupOldEventLogs_preservesDailyAggregation() {
        // 创建聚合数据（模拟已聚合的历史统计）
        LocalDate oldDate = LocalDate.now().minusDays(100);
        ToolEventDaily daily = new ToolEventDaily();
        daily.setToolId(1L);
        daily.setEventDate(oldDate);
        daily.setEventType("tool_use");
        daily.setCount(42L);
        toolEventDailyRepository.save(daily);

        // 创建一条过期原始日志
        ToolEventLog oldLog = createEventLog("retention-daily-uuid", "tool_use");
        toolEventLogRepository.save(oldLog);
        toolEventLogRepository.flush();
        backdateCreatedAt(List.of("retention-daily-uuid"), LocalDateTime.now().minusDays(100));

        // 执行清理
        scheduledTasks.cleanupOldEventLogs();

        // 验证：原始日志被清理
        assertThat(toolEventLogRepository.findAll()).isEmpty();

        // 验证：聚合数据保留
        List<ToolEventDaily> dailyRemaining = toolEventDailyRepository.findAll();
        assertThat(dailyRemaining).hasSize(1);
        assertThat(dailyRemaining.get(0).getEventDate()).isEqualTo(oldDate);
        assertThat(dailyRemaining.get(0).getCount()).isEqualTo(42L);
    }

    // =========================================================================
    // 场景三：无过期日志时，清理操作不删除任何记录
    // =========================================================================

    @Test
    void cleanupOldEventLogs_noOldLogs_deletesNothing() {
        // 只创建近期日志（createdAt = 当前时间）
        ToolEventLog recentLog1 = createEventLog("retention-noop-uuid-1", "tool_use");
        ToolEventLog recentLog2 = createEventLog("retention-noop-uuid-2", "copy");
        toolEventLogRepository.saveAll(List.of(recentLog1, recentLog2));
        toolEventLogRepository.flush();
        entityManager.clear();

        long countBefore = toolEventLogRepository.count();

        // 执行清理
        scheduledTasks.cleanupOldEventLogs();

        // 验证：记录数不变
        long countAfter = toolEventLogRepository.count();
        assertThat(countAfter).isEqualTo(countBefore);
        assertThat(countAfter).isEqualTo(2);
    }

    // =========================================================================
    // 场景四：刚好 90 天边界 — 略超过 90 天的日志被删除
    // =========================================================================

    @Test
    void cleanupOldEventLogs_boundaryCondition_deletesSlightlyOver90Days() {
        ToolEventLog boundaryLog = createEventLog("retention-boundary-uuid", "tool_use");
        toolEventLogRepository.save(boundaryLog);
        toolEventLogRepository.flush();

        // 回溯到 91 天前（略超过 90 天保留期）
        backdateCreatedAt(List.of("retention-boundary-uuid"), LocalDateTime.now().minusDays(91));

        assertThat(toolEventLogRepository.findAll()).hasSize(1);

        // 执行清理
        scheduledTasks.cleanupOldEventLogs();

        // 验证：91 天前的日志被删除
        assertThat(toolEventLogRepository.findAll()).isEmpty();
    }

    // =========================================================================
    // 场景五：空表时清理操作不报错
    // =========================================================================

    @Test
    void cleanupOldEventLogs_emptyTable_noError() {
        assertThat(toolEventLogRepository.findAll()).isEmpty();

        // 执行清理（不应抛出异常）
        scheduledTasks.cleanupOldEventLogs();

        assertThat(toolEventLogRepository.findAll()).isEmpty();
    }
}
