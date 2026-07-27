package com.panzipool.api.web.tool.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * 点赞响应数据 DTO。
 */
@Schema(description = "点赞响应数据")
@Data
@AllArgsConstructor
public class LikeResponse {

    @Schema(description = "工具当前点赞总数", example = "42")
    @JsonProperty("like_count")
    private long likeCount;

    @Schema(description = "是否点赞成功：true=首次点赞成功，false=已点赞（重复操作）", example = "true")
    private boolean liked;
}