package com.panzipool.api.web.ad.controller;

import com.panzipool.api.common.ApiResponse;
import com.panzipool.api.web.ad.dto.AdResponse;
import com.panzipool.api.web.ad.service.AdService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;

/**
 * 广告控制器。
 *
 * <p>提供广告查询接口，支持按投放位置标识查询当前有效的广告。</p>
 *
 * <p>所有路径自动携带 {@code /api/v1} 前缀（由 {@code server.servlet.context-path} 配置），
 * 因此 {@code @RequestMapping("/ads")} 对应实际路径 {@code /api/v1/ads}。</p>
 */
@Tag(name = "Ads", description = "广告查询")
@RestController
@RequestMapping("/ads")
public class AdController {

    private final AdService adService;

    public AdController(AdService adService) {
        this.adService = adService;
    }

    /**
     * 按投放位置标识查询广告列表。
     */
    @Operation(summary = "查询广告列表", description = "按投放位置标识查询已启用的广告列表")
    @GetMapping
    public ApiResponse<List<AdResponse>> listAds(
            @Parameter(description = "投放位置标识", example = "home_middle", required = true)
            @RequestParam String locationSymbol) {
        return ApiResponse.success(adService.listAds(locationSymbol));
    }

    /**
     * 按投放位置标识查询单条广告（取第一条已启用的广告）。
     */
    @Operation(summary = "查询单条广告", description = "按投放位置标识查询第一条已启用的广告")
    @GetMapping("/first")
    public ApiResponse<Optional<AdResponse>> getFirstAd(
            @Parameter(description = "投放位置标识", example = "home_middle", required = true)
            @RequestParam String locationSymbol) {
        return ApiResponse.success(adService.getFirstAd(locationSymbol));
    }
}