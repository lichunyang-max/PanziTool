package com.panzipool.api.web.feedback.controller;

import com.panzipool.api.common.ApiResponse;
import com.panzipool.api.web.feedback.dto.FeedbackRequest;
import com.panzipool.api.web.feedback.dto.FeedbackResponse;
import com.panzipool.api.web.feedback.service.FeedbackService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 意见反馈控制器。
 *
 * <p>所有路径自动携带 {@code /api/v1} 前缀（由 {@code server.servlet.context-path} 配置），
 * 因此 {@code @RequestMapping("/feedback")} 对应实际路径 {@code /api/v1/feedback}。</p>
 *
 * <p>提供以下接口：</p>
 * <ul>
 *   <li>{@code POST /feedback} —— 提交意见反馈（同一 IP 每分钟最多 3 条）</li>
 *   <li>{@code GET /feedback} —— 分页查询公开可见的反馈列表（按创建时间倒序）</li>
 * </ul>
 */
@Tag(name = "Feedback", description = "意见反馈")
@RestController
@RequestMapping("/feedback")
public class FeedbackController {

    private static final String HEADER_X_FORWARDED_FOR = "X-Forwarded-For";

    private final FeedbackService feedbackService;

    public FeedbackController(FeedbackService feedbackService) {
        this.feedbackService = feedbackService;
    }

    /**
     * 提交意见反馈。
     */
    @Operation(summary = "提交意见反馈", description = "提交一条意见反馈留言，同一 IP 每分钟最多 3 条")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "提交成功"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "参数校验失败"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "429", description = "提交过于频繁")
    })
    @PostMapping
    public ApiResponse<FeedbackResponse> createFeedback(
            @Valid @RequestBody FeedbackRequest request,
            HttpServletRequest servletRequest) {
        String clientIp = extractClientIp(servletRequest);
        return ApiResponse.success(feedbackService.createFeedback(request, clientIp));
    }

    /**
     * 分页查询公开可见的意见反馈列表（按创建时间倒序）。
     */
    @Operation(summary = "查询意见反馈列表", description = "分页查询公开可见的意见反馈列表，按创建时间倒序")
    @GetMapping
    public ApiResponse<Page<FeedbackResponse>> listPublicFeedback(
            @Parameter(description = "页码，从 0 开始", example = "0")
            @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "每页条数", example = "10")
            @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.success(feedbackService.listPublicFeedback(page, size));
    }

    /**
     * 提取客户端真实 IP。优先级：X-Forwarded-For（取第一个） > RemoteAddr。
     */
    private String extractClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader(HEADER_X_FORWARDED_FOR);
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            int commaIndex = xForwardedFor.indexOf(',');
            return commaIndex > 0
                    ? xForwardedFor.substring(0, commaIndex).trim()
                    : xForwardedFor.trim();
        }
        return request.getRemoteAddr();
    }
}
