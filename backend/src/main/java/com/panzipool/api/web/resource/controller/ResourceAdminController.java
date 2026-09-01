package com.panzipool.api.web.resource.controller;

import com.panzipool.api.common.ApiResponse;
import com.panzipool.api.web.resource.dto.CategoryRequest;
import com.panzipool.api.web.resource.dto.ResourceItemRequest;
import com.panzipool.api.web.resource.entity.ResourceCategory;
import com.panzipool.api.web.resource.entity.ResourceItem;
import com.panzipool.api.web.resource.service.ResourceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 资源管理后台控制器（/admin/resources/**，受 AdminAuthInterceptor 保护）。
 *
 * <p>提供目录（两级）与资源的增删改查，供管理后台配置资源站内容。</p>
 */
@Tag(name = "Admin Resources", description = "管理后台资源站配置")
@RestController
@RequestMapping("/admin/resources")
@RequiredArgsConstructor
public class ResourceAdminController {

    private final ResourceService resourceService;

    // =========================================================================
    // 目录管理
    // =========================================================================

    @Operation(summary = "目录列表", description = "返回全部目录（平铺，含一级与二级）")
    @GetMapping("/categories")
    public ApiResponse<List<ResourceCategory>> listCategories() {
        return ApiResponse.success(resourceService.listCategories());
    }

    @Operation(summary = "创建目录", description = "parentId 为空创建一级目录，否则创建其下二级目录")
    @PostMapping("/categories")
    public ApiResponse<ResourceCategory> createCategory(@Valid @RequestBody CategoryRequest body) {
        return ApiResponse.success(
                resourceService.createCategory(body.getName(), body.getParentId(), body.getSortOrder()));
    }

    @Operation(summary = "更新目录", description = "更新目录名称与排序号")
    @PutMapping("/categories/{id}")
    public ApiResponse<ResourceCategory> updateCategory(
            @Parameter(description = "目录 ID") @PathVariable Long id,
            @Valid @RequestBody CategoryRequest body) {
        return ApiResponse.success(
                resourceService.updateCategory(id, body.getName(), body.getSortOrder()));
    }

    @Operation(summary = "删除目录", description = "删除一级目录时级联删除其下二级目录与资源")
    @DeleteMapping("/categories/{id}")
    public ApiResponse<Void> deleteCategory(
            @Parameter(description = "目录 ID") @PathVariable Long id) {
        resourceService.deleteCategory(id);
        return ApiResponse.success();
    }

    // =========================================================================
    // 资源管理
    // =========================================================================

    @Operation(summary = "资源列表", description = "按目录查询其下资源")
    @GetMapping("/items")
    public ApiResponse<List<ResourceItem>> listItems(
            @Parameter(description = "目录 ID") @RequestParam Long categoryId) {
        return ApiResponse.success(resourceService.listItems(categoryId));
    }

    @Operation(summary = "创建资源", description = "名称、链接必填，图片/描述可选（图片空则前端展示默认图标）")
    @PostMapping("/items")
    public ApiResponse<ResourceItem> createItem(@Valid @RequestBody ResourceItemRequest body) {
        return ApiResponse.success(resourceService.createItem(
                body.getCategoryId(), body.getName(), body.getUrl(),
                body.getImage(), body.getDescription(), body.getSortOrder()));
    }

    @Operation(summary = "更新资源", description = "更新资源名称 / 链接 / 图片 / 描述 / 排序号")
    @PutMapping("/items/{id}")
    public ApiResponse<ResourceItem> updateItem(
            @Parameter(description = "资源 ID") @PathVariable Long id,
            @Valid @RequestBody ResourceItemRequest body) {
        return ApiResponse.success(resourceService.updateItem(
                id, body.getCategoryId(), body.getName(), body.getUrl(),
                body.getImage(), body.getDescription(), body.getSortOrder()));
    }

    @Operation(summary = "删除资源")
    @DeleteMapping("/items/{id}")
    public ApiResponse<Void> deleteItem(
            @Parameter(description = "资源 ID") @PathVariable Long id) {
        resourceService.deleteItem(id);
        return ApiResponse.success();
    }
}
