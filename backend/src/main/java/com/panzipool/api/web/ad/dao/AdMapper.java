package com.panzipool.api.web.ad.dao;

import com.panzipool.api.common.BaseMapper;
import com.panzipool.api.web.ad.dto.AdResponse;
import com.panzipool.api.web.ad.entity.AdPromotion;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

/**
 * AdPromotion 实体 ↔ AdResponse DTO 映射 Mapper。
 *
 * <p>MapStruct 自动映射 productDescription / productUrl / adUrl 字段。</p>
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface AdMapper extends BaseMapper<AdResponse, AdPromotion> {
}