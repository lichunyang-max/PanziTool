package com.panzipool.api.web.ad.dao;

import com.panzipool.api.common.BaseMapper;
import com.panzipool.api.web.ad.dto.AdAdminDTO;
import com.panzipool.api.web.ad.dto.AdResponse;
import com.panzipool.api.web.ad.dto.AdSaveRequest;
import com.panzipool.api.web.ad.entity.AdPromotion;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

/**
 * AdPromotion 实体 ↔ DTO 映射 Mapper。
 *
 * <p>MapStruct 自动映射 productDescription / productUrl / adUrl 字段。</p>
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface AdMapper extends BaseMapper<AdResponse, AdPromotion> {

    /**
     * Entity → 管理后台全字段 DTO。
     */
    AdAdminDTO toAdminDto(AdPromotion entity);

    /**
     * 新增请求 → Entity（id / 审计字段由持久层与 AuditingEntityListener 负责）。
     */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    AdPromotion toNewEntity(AdSaveRequest request);

    /**
     * 编辑请求 → 原地更新 Entity（保留 id 与 createdAt/updatedAt 审计字段）。
     */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntity(@MappingTarget AdPromotion entity, AdSaveRequest request);
}
