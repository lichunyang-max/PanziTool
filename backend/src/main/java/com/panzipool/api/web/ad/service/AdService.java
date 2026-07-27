package com.panzipool.api.web.ad.service;

import com.panzipool.api.web.ad.dto.AdResponse;

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
}