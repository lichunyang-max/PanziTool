package com.panzipool.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

/**
 * 批量匿名统计事件上报请求 DTO。
 *
 * <p>前端将多个事件批量打包发送，减少网络请求次数。
 * 请求格式：{ "events": [EventReportRequest, ...] }</p>
 */
@Schema(description = "批量事件上报请求")
public class BatchEventReportRequest {

    @Schema(description = "事件列表", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotEmpty(message = "事件列表不能为空")
    @Valid
    private List<EventReportRequest> events;

    public List<EventReportRequest> getEvents() {
        return events;
    }

    public void setEvents(List<EventReportRequest> events) {
        this.events = events;
    }
}
