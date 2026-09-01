package com.panzipool.api.web.resource.dao;

import com.panzipool.api.web.resource.entity.ResourceItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * 资源条目 Repository。
 */
public interface ResourceItemRepository extends JpaRepository<ResourceItem, Long> {

    /**
     * 查询某目录下的全部资源（按排序号）。
     */
    List<ResourceItem> findByCategoryIdOrderBySortOrderAscIdAsc(Long categoryId);

    /**
     * 统计某目录下的资源数量（删除目录前校验/级联删除用）。
     */
    long countByCategoryId(Long categoryId);

    /**
     * 删除某目录下的全部资源。
     */
    void deleteByCategoryId(Long categoryId);

    /**
     * 原子递增下载次数（避免 "读-改-写" 竞态）。
     */
    @Modifying
    @Query("UPDATE ResourceItem r SET r.downloadCount = r.downloadCount + 1 WHERE r.id = :id")
    void incrementDownloadCount(@Param("id") Long id);

    /**
     * 原子递增点赞次数。
     */
    @Modifying
    @Query("UPDATE ResourceItem r SET r.likeCount = r.likeCount + 1 WHERE r.id = :id")
    void incrementLikeCount(@Param("id") Long id);
}
