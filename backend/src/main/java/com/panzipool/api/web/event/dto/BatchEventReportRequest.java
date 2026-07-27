package com.panzipool.api.web.event.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

/**
 * 批量匿名统计事件上报请求 DTO。
 */
@Schema(description = "批量事件上报请求")
@Data
public class BatchEventReportRequest {

    @Schema(description = "事件列表", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotEmpty(message = "事件列表不能为空")
    @Valid
    private List<EventReportRequest> events;
}