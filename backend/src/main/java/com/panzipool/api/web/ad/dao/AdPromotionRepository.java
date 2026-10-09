package com.panzipool.api.web.ad.dao;

import com.panzipool.api.web.ad.entity.AdPromotion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * 广告推广 Repository（ad_promotion 表）。
 *
 * <p>继承 {@link JpaSpecificationExecutor} 支持管理后台的动态条件分页查询
 * （关键词 / 投放位置标识 / 启用状态任意组合）。</p>
 */
@Repository
public interface AdPromotionRepository extends JpaRepository<AdPromotion, Long>, JpaSpecificationExecutor<AdPromotion> {

    /**
     * 按投放位置标识和启用状态查询广告列表。
     */
    List<AdPromotion> findByAdLocationSymbolAndAdEnabled(String adLocationSymbol, Boolean adEnabled);

    /**
     * 按投放位置标识查询已启用的第一条广告。
     */
    Optional<AdPromotion> findFirstByAdLocationSymbolAndAdEnabledTrue(String adLocationSymbol);
}
