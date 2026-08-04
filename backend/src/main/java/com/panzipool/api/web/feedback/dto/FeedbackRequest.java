package com.panzipool.api.web.feedback.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 意见反馈请求 DTO。
 */
@Schema(description = "意见反馈请求")
@Data
public class FeedbackRequest {

    @Schema(description = "反馈内容（5-1000 字符）", example = "希望增加一个 Cron 表达式解析工具",
            requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "content 不能为空")
    @Size(min = 5, max = 1000, message = "content 长度需在 5-1000 字符之间")
    private String content;

    @Schema(description = "昵称（最长 30 字符）", example = "匿名用户")
    @Size(max = 30, message = "nickname 最长 30 字符")
    private String nickname;

    @Schema(description = "联系方式（最长 100 字符）", example = "user@example.com")
    @Size(max = 100, message = "contact 最长 100 字符")
    private String contact;
}
