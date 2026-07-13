package com.panzipool.api.service;

import com.panzipool.api.common.BusinessException;
import com.panzipool.api.dto.EventReportRequest;
import com.panzipool.api.entity.SiteVisitorDaily;
import com.panzipool.api.entity.Tool;
import com.panzipool.api.entity.ToolEventLog;
import com.panzipool.api.repository.SiteVisitorDailyRepository;
import com.panzipool.api.repository.ToolEventLogRepository;
import com.panzipool.api.repository.ToolRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

/**
 * 匿名统计事件上报服务。
 *
 * <p>核心职责：</p>
 * <ol>
 *   <li>频率检查（防刷）：调用 {@link RateLimitService} 检查 anon_id / IP 是否超限</li>
 *   <li>工具查询（如提供 tool_slug）：不存在则抛出 400 业务异常</li>
 *   <li>写入 tool_event_logs 原始事件日志</li>
 *   <li>同步更新 tools.use_count（非 page_view 事件）</li>
 *   <li>更新 site_visitor_daily.pv（page_view 事件）</li>
 * </ol>
 */
@Service
public class EventService {

    private static final Logger log = LoggerFactory.getLogger(EventService.class);

    private final RateLimitService rateLimitService;
    private final ToolRepository toolRepository;
    private final ToolEventLogRepository toolEventLogRepository;
    private final SiteVisitorDailyRepository siteVisitorDailyRepository;

    public EventService(RateLimitService rateLimitService,
                        ToolRepository toolRepository,
                        ToolEventLogRepository toolEventLogRepository,
                        SiteVisitorDailyRepository siteVisitorDailyRepository) {
        this.rateLimitService = rateLimitService;
        this.toolRepository = toolRepository;
        this.toolEventLogRepository = toolEventLogRepository;
        this.siteVisitorDailyRepository = siteVisitorDailyRepository;
    }

    /**
     * 上报匿名统计事件。
     *
     * @param request  事件上报请求
     * @param clientIp 客户端 IP（优先 X-Forwarded-For，否则 remoteAddr）
     * @throws BusinessException 当 tool_slug 对应的工具不存在时抛出（code=404）
     */
    @Transactional
    public void reportEvent(EventReportRequest request, String clientIp) {
        // 1. 频率检查（防刷）
        rateLimitService.checkRateLimit(request.getAnonId(), clientIp);

        // 2. 查询工具（如果提供了 tool_slug）
        Tool tool = null;
        String toolSlug = request.getToolSlug();
        if (toolSlug != null && !toolSlug.isBlank()) {
            tool = toolRepository.findBySlug(toolSlug)
                    .orElseThrow(() -> new BusinessException(400, "工具不存在"));
        }

        // 3. 写入 tool_event_logs
        ToolEventLog eventLog = new ToolEventLog();
        eventLog.setToolId(tool != null ? tool.getId() : null);
        eventLog.setAnonId(request.getAnonId());
        eventLog.setEventType(request.getEventType());
        toolEventLogRepository.save(eventLog);

        // 4. 更新 tools.use_count（仅对非 page_view 事件且存在 tool 时）
        if (tool != null && !"page_view".equals(request.getEventType())) {
            toolRepository.incrementUseCount(tool.getId());
            log.debug("工具使用计数递增: slug={}, event_type={}", toolSlug, request.getEventType());
        }

        // 5. 更新 site_visitor_daily.pv（page_view 事件）
        if ("page_view".equals(request.getEventType())) {
            updateSiteVisitorDailyPv();
        }

        log.debug("事件上报成功: anon_id={}, event_type={}, tool_slug={}",
                request.getAnonId(), request.getEventType(), toolSlug);
    }

    /**
     * 更新站点日 PV 计数。
     *
     * <p>使用 upsert 逻辑：先尝试原子递增（UPDATE），若当天记录不存在则 INSERT。</p>
     */
    private void updateSiteVisitorDailyPv() {
        LocalDate today = LocalDate.now();
        int updated = siteVisitorDailyRepository.incrementPv(today);

        if (updated == 0) {
            // 当天记录不存在，插入新记录
            SiteVisitorDaily daily = new SiteVisitorDaily();
            daily.setStatDate(today);
            daily.setPv(1L);
            daily.setUv(0L);
            siteVisitorDailyRepository.save(daily);
            log.debug("创建当日站点统计记录: statDate={}, pv=1", today);
        }
    }
}
