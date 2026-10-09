package com.panzipool.api.web.ad.service.impl;

import com.panzipool.api.common.ApiConstants;
import com.panzipool.api.common.BusinessException;
import com.panzipool.api.web.ad.dao.AdMapper;
import com.panzipool.api.web.ad.dao.AdPromotionRepository;
import com.panzipool.api.web.ad.dto.AdAdminDTO;
import com.panzipool.api.web.ad.dto.AdResponse;
import com.panzipool.api.web.ad.dto.AdSaveRequest;
import com.panzipool.api.web.ad.entity.AdPromotion;
import com.panzipool.api.web.ad.service.AdService;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
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

    // =========================================================================
    // 管理后台
    // =========================================================================

    @Override
    @Transactional(readOnly = true)
    public Page<AdAdminDTO> listAdPage(int page, int size, String keyword, String locationSymbol, Boolean enabled) {
        String normalizedKeyword = (keyword == null || keyword.isBlank()) ? null : keyword.trim().toLowerCase();
        String normalizedLocation = (locationSymbol == null || locationSymbol.isBlank()) ? null : locationSymbol.trim();
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id")));

        Specification<AdPromotion> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // 关键词模糊匹配商品描述 / 推广位名称 / 推广位ID / 广告联盟
            if (normalizedKeyword != null) {
                String pattern = "%" + normalizedKeyword + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("productDescription")), pattern),
                        cb.like(cb.lower(root.get("adPlacement")), pattern),
                        cb.like(cb.lower(root.get("pid")), pattern),
                        cb.like(cb.lower(root.get("adUnion")), pattern)
                ));
            }
            // 投放位置标识精确匹配
            if (normalizedLocation != null) {
                predicates.add(cb.equal(root.get("adLocationSymbol"), normalizedLocation));
            }
            // 启用状态精确匹配
            if (enabled != null) {
                predicates.add(cb.equal(root.get("adEnabled"), enabled));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return adPromotionRepository.findAll(spec, pageable).map(adMapper::toAdminDto);
    }

    @Override
    @Transactional(readOnly = true)
    public AdAdminDTO getAd(Long id) {
        return adMapper.toAdminDto(findAdOrThrow(id));
    }

    @Override
    @Transactional
    public AdAdminDTO createAd(AdSaveRequest request) {
        validateDateRange(request);
        AdPromotion entity = adMapper.toNewEntity(request);
        return adMapper.toAdminDto(adPromotionRepository.save(entity));
    }

    @Override
    @Transactional
    public AdAdminDTO updateAd(Long id, AdSaveRequest request) {
        validateDateRange(request);
        AdPromotion entity = findAdOrThrow(id);
        adMapper.updateEntity(entity, request);
        return adMapper.toAdminDto(adPromotionRepository.save(entity));
    }

    @Override
    @Transactional
    public void deleteAd(Long id) {
        if (!adPromotionRepository.existsById(id)) {
            throw new BusinessException(ApiConstants.CODE_NOT_FOUND, "广告不存在", HttpStatus.NOT_FOUND);
        }
        adPromotionRepository.deleteById(id);
    }

    private AdPromotion findAdOrThrow(Long id) {
        return adPromotionRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ApiConstants.CODE_NOT_FOUND, "广告不存在", HttpStatus.NOT_FOUND));
    }

    private void validateDateRange(AdSaveRequest request) {
        if (request.getAdEnd().isBefore(request.getAdStart())) {
            throw new BusinessException(ApiConstants.CODE_BAD_REQUEST, "广告结束时间不能早于开始时间");
        }
    }
}
