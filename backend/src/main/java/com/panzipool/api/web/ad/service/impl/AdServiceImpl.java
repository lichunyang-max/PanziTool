package com.panzipool.api.web.ad.service.impl;

import com.panzipool.api.web.ad.dao.AdMapper;
import com.panzipool.api.web.ad.dao.AdPromotionRepository;
import com.panzipool.api.web.ad.dto.AdResponse;
import com.panzipool.api.web.ad.service.AdService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * 广告服务实现。
 *
 * <p>使用 {@link AdMapper} 自动完成 Entity→DTO 映射，
 * 消除手工 toDto 样板代码。</p>
 */
@Service
@RequiredArgsConstructor
public class AdServiceImpl implements AdService {

    private final AdPromotionRepository adPromotionRepository;
    private final AdMapper adMapper;

    @Override
    public List<AdResponse> listAds(String locationSymbol) {
        return adMapper.toDtoList(
                adPromotionRepository.findByAdLocationSymbolAndAdEnabled(locationSymbol, true)
        );
    }

    @Override
    public Optional<AdResponse> getFirstAd(String locationSymbol) {
        return adPromotionRepository
                .findFirstByAdLocationSymbolAndAdEnabledTrue(locationSymbol)
                .map(adMapper::toDto);
    }
}