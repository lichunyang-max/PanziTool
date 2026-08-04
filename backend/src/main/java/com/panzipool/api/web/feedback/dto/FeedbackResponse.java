package com.panzipool.api.web.feedback.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.panzipool.api.web.feedback.entity.FeedbackMessage;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 意见反馈响应 DTO。
 *
 * <p>文本字段在由实体映射时进行 HTML 转义，防止存储型 XSS。</p>
 */
@Schema(description = "意见反馈信息")
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class FeedbackResponse {

    @Schema(description = "留言 ID", example = "1")
    private Long id;

    @Schema(description = "反馈内容", example = "希望增加一个 JSON 比对工具")
    private String content;

    @Schema(description = "昵称", example = "匿名用户")
    private String nickname;

    @Schema(description = "创建时间")
    private LocalDateTime createdAt;

    @Schema(description = "管理员回复内容")
    private String adminReply;

    @Schema(description = "回复时间")
    private LocalDateTime replyAt;

    /**
     * 由实体映射为响应 DTO，并对文本字段进行 HTML 转义。
     */
    public static FeedbackResponse from(FeedbackMessage entity) {
        if (entity == null) {
            return null;
        }
        FeedbackResponse resp = new FeedbackResponse();
        resp.setId(entity.getId());
        resp.setContent(escapeHtml(entity.getContent()));
        resp.setNickname(escapeHtml(entity.getNickname()));
        resp.setCreatedAt(entity.getCreatedAt());
        resp.setAdminReply(escapeHtml(entity.getAdminReply()));
        resp.setReplyAt(entity.getReplyAt());
        return resp;
    }

    /**
     * 简易 HTML 转义：转义 {@code < > & " '} 五个字符。
     */
    private static String escapeHtml(String input) {
        if (input == null) {
            return null;
        }
        StringBuilder sb = new StringBuilder(input.length());
        for (int i = 0; i < input.length(); i++) {
            char c = input.charAt(i);
            switch (c) {
                case '<' -> sb.append("&lt;");
                case '>' -> sb.append("&gt;");
                case '&' -> sb.append("&amp;");
                case '"' -> sb.append("&quot;");
                case '\'' -> sb.append("&#39;");
                default -> sb.append(c);
            }
        }
        return sb.toString();
    }
}
