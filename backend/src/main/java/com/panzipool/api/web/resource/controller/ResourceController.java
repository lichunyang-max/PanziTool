package com.panzipool.api.web.resource.controller;

import com.panzipool.api.common.ApiResponse;
import com.panzipool.api.web.resource.dto.LikeRequest;
import com.panzipool.api.web.resource.dto.ResourceItemDetail;
import com.panzipool.api.web.resource.dto.ResourceTreeNode;
import com.panzipool.api.web.resource.service.ResourceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 资源前台控制器（公开接口）。
 *
 * <p>供资源展示站（resource.panzipool.com）查询完整目录树、资源详情，
 * 以及记录下载次数与点赞。</p>
 */
@Tag(name = "Resources", description = "资源站目录树、资源详情、下载计数与点赞")
@RestController
@RequestMapping("/resources")
public class ResourceController {

    private final ResourceService resourceService;

    public ResourceController(ResourceService resourceService) {
        this.resourceService = resourceService;
    }

    @Operation(summary = "资源树", description = "返回两级目录与资源的完整树（资源按下载次数降序，下载最多的排最前）")
    @GetMapping("/tree")
    public ApiResponse<List<ResourceTreeNode>> getTree() {
        return ApiResponse.success(resourceService.getTree());
    }

    @Operation(summary = "资源详情", description = "返回资源全部信息（名称/链接/图片/描述/下载次数/点赞次数），含所属目录面包屑")
    @GetMapping("/items/{id}")
    public ApiResponse<ResourceItemDetail> getItemDetail(
            @Parameter(description = "资源 ID") @PathVariable Long id) {
        return ApiResponse.success(resourceService.getItemDetail(id));
    }

    @Operation(summary = "记录下载", description = "点击跳转时调用，下载次数 +1")
    @PostMapping("/items/{id}/download")
    public ApiResponse<Void> recordDownload(
            @Parameter(description = "资源 ID") @PathVariable Long id) {
        resourceService.recordDownload(id);
        return ApiResponse.success();
    }

    @Operation(summary = "点赞", description = "同一 anon_id 对同一资源仅能点赞一次且不可取消；重复点赞返回 409 并携带当前次数")
    @PostMapping("/items/{id}/like")
    public ResponseEntity<ApiResponse<ResourceService.LikeResult>> like(
            @Parameter(description = "资源 ID") @PathVariable Long id,
            @Valid @RequestBody LikeRequest body) {
        ResourceService.LikeResult result = resourceService.like(id, body.getAnonId());
        if (result.liked()) {
            // 首次点赞：200 + 成功信封
            return ResponseEntity.ok(ApiResponse.success(result));
        }
        // 重复点赞：409 + 失败信封（携带当前 like_count 供前端同步）
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiResponse.error(409, "您已经点过赞了", result));
    }
}
