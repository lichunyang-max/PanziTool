package com.panzipool.api.web.tool.service;

import com.panzipool.api.web.tool.dto.LikeResponse;

/**
 * 点赞服务接口。
 */
public interface LikeService {

    /**
     * 对指定工具点赞。
     *
     * <p>响应语义由调用方（Controller）根据 {@link LikeResponse#isLiked()} 映射 HTTP 状态码：
     * {@code liked=true}（首次点赞）→ HTTP 200；
     * {@code liked=false}（重复点赞）→ HTTP 409。</p>
     *
     * @param slug   工具的 URL 友好标识
     * @param anonId 匿名用户 ID（UUID）
     * @return 点赞结果（包含当前 like_count 与 liked 标志）
     */
    LikeResponse like(String slug, String anonId);
}