package com.panzipool.api.controller;

import com.panzipool.api.common.ApiResponse;
import com.panzipool.api.dto.BatchEventReportRequest;
import com.panzipool.api.dto.EventReportRequest;
import com.panzipool.api.service.EventService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 匿名统计事件上报控制器。
 *
 * <p>所有路径自动携带 {@code /api/v1} 前缀（由 {@code server.servlet.context-path} 配置），
 * 因此 {@code @RequestMapping("/events")} 对应实际路径 {@code /api/v1/events}。</p>
 *
 * <p>提供以下接口：</p>
 * <ul>
 *   <li>{@code POST /events} —— 上报匿名统计事件（page_view / tool_use / copy / download）</li>
 * </ul>
 */
@Tag(name = "Events", description = "匿名统计事件上报")
@RestController
@RequestMapping("/events")
public class EventController {

    private static final String HEADER_X_FORWARDED_FOR = "X-Forwarded-For";

    private final EventService eventService;

    public EventController(EventService eventService) {
        this.eventService = eventService;
    }

    /**
     * 批量匿名统计事件上报接口。
     *
     * <p><b>请求示例</b>：</p>
     * <pre>
     * POST /api/v1/events
     * {
     *   "events": [
     *     {
     *       "tool_slug": "json-formatter",
     *       "anon_id": "550e8400-e29b-41d4-a716-446655440000",
     *       "event_type": "tool_use"
     *     }
     *   ]
     * }
     * </pre>
     *
     * <p><b>响应</b>：</p>
     * <ul>
     *   <li>成功：HTTP 200 + {@code {"code": 0}}</li>
     *   <li>校验失败：HTTP 400 + {@code {"code": 400, "message": "..."}}</li>
     *   <li>工具不存在：HTTP 400 + {@code {"code": 400, "message": "工具不存在"}}</li>
     *   <li>频率超限：HTTP 429 + {@code {"code": 429, "message": "请求过于频繁，请稍后再试"}}</li>
     *   <li>服务端错误：HTTP 500 + {@code {"code": 500, "message": "服务器内部错误"}}</li>
     * </ul>
     *
     * <p><b>客户端 IP 获取策略</b>：优先读取 {@code X-Forwarded-For} 头（取第一个），
     * 若无则使用 {@code HttpServletRequest.getRemoteAddr()}。</p>
     *
     * @param request 批量事件上报请求体（含 events 数组）
     * @param servletRequest 原始请求（用于获取客户端 IP）
     * @return 成功响应信封
     */
    @Operation(summary = "上报批量匿名统计事件", description = "批量上报 page_view / tool_use / copy / download 事件，含频率限制防刷")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "上报成功"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "参数校验失败或工具不存在"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "429", description = "请求过于频繁")
    })
    @PostMapping
    public ApiResponse<Void> reportBatchEvent(
            @Valid @RequestBody BatchEventReportRequest request,
            HttpServletRequest servletRequest) {

        String clientIp = extractClientIp(servletRequest);
        for (EventReportRequest eventRequest : request.getEvents()) {
            eventService.reportEvent(eventRequest, clientIp);
        }
        return ApiResponse.success();
    }

    /**
     * 提取客户端真实 IP。
     *
     * <p>优先级：X-Forwarded-For（取第一个） > RemoteAddr。</p>
     */
    private String extractClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader(HEADER_X_FORWARDED_FOR);
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            // X-Forwarded-For 格式: "client, proxy1, proxy2"，取第一个
            int commaIndex = xForwardedFor.indexOf(',');
            return commaIndex > 0
                    ? xForwardedFor.substring(0, commaIndex).trim()
                    : xForwardedFor.trim();
        }
        return request.getRemoteAddr();
    }
}
