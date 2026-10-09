package com.panzipool.api.web.ad.controller;

import com.panzipool.api.common.ApiResponse;
import com.panzipool.api.web.ad.dto.AdAdminDTO;
import com.panzipool.api.web.ad.dto.AdSaveRequest;
import com.panzipool.api.web.ad.service.AdService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理后台广告管理控制器（/admin/ads/**，受 AdminAuthInterceptor 保护）。
 *
 * <p>提供广告（ad_promotion 表）的分页查询、详情、新增、编辑与删除。</p>
 */
@Tag(name = "Admin Ads", description = "管理后台广告管理")
@RestController
@RequestMapping("/admin/ads")
@RequiredArgsConstructor
public class AdAdminController {

    private final AdService adService;

    @Operation(summary = "广告列表（分页）", description = "支持关键词搜索（商品描述/推广位名称/推广位ID/广告联盟）、投放位置标识与启用状态过滤")
    @GetMapping("")
    public ApiResponse<Page<AdAdminDTO>> listAds(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String locationSymbol,
            @Parameter(description = "启用状态：true=启用，false=停用")
            @RequestParam(required = false) Boolean enabled) {
        if (size < 1) {
            size = 10;
        } else if (size > 100) {
            size = 100;
        }
        return ApiResponse.success(adService.listAdPage(page, size, keyword, locationSymbol, enabled));
    }

    @Operation(summary = "获取广告详情")
    @GetMapping("/{id}")
    public ApiResponse<AdAdminDTO> getAd(
            @Parameter(description = "广告ID") @PathVariable Long id) {
        return ApiResponse.success(adService.getAd(id));
    }

    @Operation(summary = "新增广告")
    @PostMapping("")
    public ApiResponse<AdAdminDTO> createAd(@Valid @RequestBody AdSaveRequest body) {
        return ApiResponse.success(adService.createAd(body));
    }

    @Operation(summary = "更新广告")
    @PutMapping("/{id}")
    public ApiResponse<AdAdminDTO> updateAd(
            @Parameter(description = "广告ID") @PathVariable Long id,
            @Valid @RequestBody AdSaveRequest body) {
        return ApiResponse.success(adService.updateAd(id, body));
    }

    @Operation(summary = "删除广告", description = "物理删除一条广告，删除后不可恢复")
    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteAd(
            @Parameter(description = "广告ID") @PathVariable Long id) {
        adService.deleteAd(id);
        return ApiResponse.success(null);
    }
}
