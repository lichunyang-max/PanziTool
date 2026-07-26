package com.panzipool.api.repository;

import com.panzipool.api.entity.AdPromotion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * 广告推广 Repository（ad_promotion 表）。
 *
 * <p>提供按投放位置标识和启用状态查询广告的能力。</p>
 */
@Repository
public interface AdPromotionRepository extends JpaRepository<AdPromotion, Long> {

    /**
     * 按投放位置标识和启用状态查询广告列表。
     *
     * @param adLocationSymbol 投放位置标识（如：home_middle）
     * @param adEnabled        启用状态（true=有效）
     * @return 广告列表
     */
    List<AdPromotion> findByAdLocationSymbolAndAdEnabled(String adLocationSymbol, Boolean adEnabled);

    /**
     * 按投放位置标识查询已启用的第一条广告。
     *
     * @param adLocationSymbol 投放位置标识（如：dev_tool_middle）
     * @return 广告实体（可能为空）
     */
    Optional<AdPromotion> findFirstByAdLocationSymbolAndAdEnabledTrue(String adLocationSymbol);
}
