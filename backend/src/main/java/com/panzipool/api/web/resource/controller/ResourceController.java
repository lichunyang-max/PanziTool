package com.panzipool.api.web.resource.controller;

import com.panzipool.api.common.ApiResponse;
import com.panzipool.api.web.resource.dto.ResourceTreeNode;
import com.panzipool.api.web.resource.service.ResourceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 资源前台控制器（公开接口）。
 *
 * <p>供资源展示站（resource.panzi.com）查询完整目录树与资源列表。</p>
 */
@Tag(name = "Resources", description = "资源站目录树与资源查询")
@RestController
@RequestMapping("/resources")
public class ResourceController {

    private final ResourceService resourceService;

    public ResourceController(ResourceService resourceService) {
        this.resourceService = resourceService;
    }

    @Operation(summary = "资源树", description = "返回两级目录与资源的完整树（一级目录 → 二级目录 → 资源）")
    @GetMapping("/tree")
    public ApiResponse<List<ResourceTreeNode>> getTree() {
        return ApiResponse.success(resourceService.getTree());
    }
}
