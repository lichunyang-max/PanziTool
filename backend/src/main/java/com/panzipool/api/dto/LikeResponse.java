package com.panzipool.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 点赞响应数据 DTO。
 *
 * <p>首次点赞（HTTP 200）：{@code liked=true}，{@code like_count} 为更新后的总数。</p>
 * <p>重复点赞（HTTP 409）：{@code liked=false}，{@code like_count} 为当前总数（未变化），
 * 供前端同步修正 localStorage 状态。</p>
 *
 * <p>JSON 字段名为 {@code like_count}（snake_case），与前端约定一致。</p>
 */
@Schema(description = "点赞响应数据")
public class LikeResponse {

    @Schema(description = "工具当前点赞总数", example = "42")
    @JsonProperty("like_count")
    private final long likeCount;

    @Schema(description = "是否点赞成功：true=首次点赞成功，false=已点赞（重复操作）", example = "true")
    private final boolean liked;

    public LikeResponse(long likeCount, boolean liked) {
        this.likeCount = likeCount;
        this.liked = liked;
    }

    public long getLikeCount() {
        return likeCount;
    }

    public boolean isLiked() {
        return liked;
    }
}
