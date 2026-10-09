package com.panzipool.api.web.ad.service;

import com.panzipool.api.web.ad.dto.AdAdminDTO;
import com.panzipool.api.web.ad.dto.AdResponse;
import com.panzipool.api.web.ad.dto.AdSaveRequest;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.Optional;

/**
 * 广告服务接口。
 */
public interface AdService {

    /**
     * 按投放位置标识查询广告列表。
     */
    List<AdResponse> listAds(String locationSymbol);

    /**
     * 按投放位置标识查询单条广告（取第一条已启用的广告）。
     */
    Optional<AdResponse> getFirstAd(String locationSymbol);

    // =========================================================================
    // 管理后台
    // =========================================================================

    /**
     * 管理后台分页查询广告。
     *
     * @param page           页码（从 0 开始）
     * @param size           每页条数
     * @param keyword        关键词（商品描述 / 推广位名称 / 推广位ID / 广告联盟），可空
     * @param locationSymbol 投放位置标识精确过滤，可空
     * @param enabled        启用状态过滤，可空
     */
    Page<AdAdminDTO> listAdPage(int page, int size, String keyword, String locationSymbol, Boolean enabled);

    /**
     * 查询广告详情（管理后台全字段）。
     */
    AdAdminDTO getAd(Long id);

    /**
     * 新增广告。
     */
    AdAdminDTO createAd(AdSaveRequest request);

    /**
     * 更新广告。
     */
    AdAdminDTO updateAd(Long id, AdSaveRequest request);

    /**
     * 删除广告（物理删除）。
     */
    void deleteAd(Long id);
}
