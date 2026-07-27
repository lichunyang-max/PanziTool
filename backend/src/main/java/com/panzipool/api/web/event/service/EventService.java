package com.panzipool.api.web.event.service;

import com.panzipool.api.web.event.dto.EventReportRequest;

/**
 * 匿名统计事件上报服务接口。
 */
public interface EventService {

    /**
     * 上报匿名统计事件。
     *
     * @param request  事件上报请求
     * @param clientIp 客户端 IP（优先 X-Forwarded-For，否则 remoteAddr）
     * @throws com.panzipool.api.common.BusinessException 当 tool_slug 对应的工具不存在时抛出（code=404）
     */
    void reportEvent(EventReportRequest request, String clientIp);
}