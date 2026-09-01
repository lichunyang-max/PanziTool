package com.panzipool.api.web.resource.dao;

import com.panzipool.api.web.resource.entity.ResourceLike;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 资源点赞记录 Repository。
 */
public interface ResourceLikeRepository extends JpaRepository<ResourceLike, Long> {

    /**
     * 判断某匿名用户是否已对某资源点赞。
     */
    boolean existsByItemIdAndAnonId(Long itemId, String anonId);
}
