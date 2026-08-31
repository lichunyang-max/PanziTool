package com.panzipool.api.web.resource.dao;

import com.panzipool.api.web.resource.entity.ResourceCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * 资源目录 Repository。
 */
public interface ResourceCategoryRepository extends JpaRepository<ResourceCategory, Long> {

    /**
     * 按排序号查询全部目录（前台组装树、后台列表共用）。
     */
    List<ResourceCategory> findAllByOrderBySortOrderAscIdAsc();

    /**
     * 查询指定父目录下的子目录。
     */
    List<ResourceCategory> findByParentIdOrderBySortOrderAscIdAsc(Long parentId);

    /**
     * 统计某目录下的子目录数量（删除前校验）。
     */
    long countByParentId(Long parentId);
}
