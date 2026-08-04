package com.panzipool.api.web.admin.controller;

import com.panzipool.api.common.ApiResponse;
import com.panzipool.api.web.admin.dto.AdminFeedbackDetail;
import com.panzipool.api.web.admin.dto.AdminFeedbackItem;
import com.panzipool.api.web.admin.dto.AdminReplyRequest;
import com.panzipool.api.web.admin.dto.AdminStatusRequest;
import com.panzipool.api.web.admin.service.AdminFeedbackService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Admin Feedback", description = "管理后台留言管理")
@RestController
@RequestMapping("/admin/feedback")
@RequiredArgsConstructor
public class AdminFeedbackController {

    private final AdminFeedbackService service;

    @Operation(summary = "留言列表（分页）", description = "支持按状态筛选和关键词搜索内容/昵称")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "成功返回分页数据")
    })
    @GetMapping("")
    public ApiResponse<Page<AdminFeedbackItem>> listFeedback(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword) {
        if (size < 1) {
            size = 10;
        } else if (size > 100) {
            size = 100;
        }
        return ApiResponse.success(service.listFeedback(page, size, status, keyword));
    }

    @Operation(summary = "获取留言详情")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "成功返回详情"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "留言不存在")
    })
    @GetMapping("/{id}")
    public ApiResponse<AdminFeedbackDetail> getFeedbackDetail(
            @Parameter(description = "留言ID") @PathVariable Long id) {
        return ApiResponse.success(service.getFeedbackDetail(id));
    }

    @Operation(summary = "回复留言", description = "保存管理员回复内容，同时记录回复时间和回复人")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "回复成功"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "回复内容为空或超过长度"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "留言不存在")
    })
    @PutMapping("/{id}/reply")
    public ApiResponse<AdminFeedbackDetail> replyFeedback(
            @Parameter(description = "留言ID") @PathVariable Long id,
            @Valid @RequestBody AdminReplyRequest body,
            HttpServletRequest request) {
        String adminUser = (String) request.getAttribute("adminUser");
        if (adminUser == null || adminUser.isBlank()) {
            adminUser = "system";
        }
        return ApiResponse.success(service.replyFeedback(id, body.getReply(), adminUser));
    }

    @Operation(summary = "更新留言状态", description = "设置留言为 visible/hidden/deleted")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "状态更新成功"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "非法状态值"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "留言不存在")
    })
    @PutMapping("/{id}/status")
    public ApiResponse<AdminFeedbackDetail> updateStatus(
            @Parameter(description = "留言ID") @PathVariable Long id,
            @Valid @RequestBody AdminStatusRequest body) {
        return ApiResponse.success(service.updateStatus(id, body.getStatus()));
    }
}
