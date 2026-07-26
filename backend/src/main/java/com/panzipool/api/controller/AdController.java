package com.panzipool.api.controller;

import com.panzipool.api.common.ApiResponse;
import com.panzipool.api.dto.AdResponse;
import com.panzipool.api.entity.AdPromotion;
import com.panzipool.api.repository.AdPromotionRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

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

    private final AdPromotionRepository adPromotionRepository;

    public AdController(AdPromotionRepository adPromotionRepository) {
        this.adPromotionRepository = adPromotionRepository;
    }

    /**
     * 按投放位置标识查询广告列表。
     *
     * <p>查询指定投放位置（如 home_middle）的所有已启用广告。</p>
     *
     * @param locationSymbol 投放位置标识（如：home_middle）
     * @return 广告列表
     */
    @Operation(summary = "查询广告列表", description = "按投放位置标识查询已启用的广告列表")
    @GetMapping
    public ApiResponse<List<AdResponse>> listAds(
            @Parameter(description = "投放位置标识", example = "home_middle", required = true)
            @RequestParam String locationSymbol) {

        List<AdPromotion> ads = adPromotionRepository
                .findByAdLocationSymbolAndAdEnabled(locationSymbol, true);

        List<AdResponse> response = ads.stream()
                .map(ad -> new AdResponse(
                        ad.getProductDescription(),
                        ad.getProductUrl(),
                        ad.getAdUrl()
                ))
                .collect(Collectors.toList());

        return ApiResponse.success(response);
    }

    /**
     * 按投放位置标识查询单条广告（取第一条已启用的广告）。
     *
     * @param locationSymbol 投放位置标识（如：home_middle）
     * @return 广告信息（可能为空）
     */
    @Operation(summary = "查询单条广告", description = "按投放位置标识查询第一条已启用的广告")
    @GetMapping("/first")
    public ApiResponse<Optional<AdResponse>> getFirstAd(
            @Parameter(description = "投放位置标识", example = "home_middle", required = true)
            @RequestParam String locationSymbol) {

        Optional<AdResponse> ad = adPromotionRepository
                .findFirstByAdLocationSymbolAndAdEnabledTrue(locationSymbol)
                .map(adPromotion -> new AdResponse(
                        adPromotion.getProductDescription(),
                        adPromotion.getProductUrl(),
                        adPromotion.getAdUrl()
                ));

        return ApiResponse.success(ad);
    }
}
