package com.panzipool.api.web.admin.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.panzipool.api.web.feedback.entity.FeedbackMessage;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;

@Schema(description = "管理后台留言详情")
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AdminFeedbackDetail {

    @Schema(description = "留言ID", example = "1")
    private Long id;

    @Schema(description = "反馈内容", example = "希望增加一个 JSON 比对工具")
    private String content;

    @Schema(description = "昵称", example = "匿名用户")
    private String nickname;

    @Schema(description = "联系方式", example = "user@example.com")
    private String contact;

    @Schema(description = "提交者IP", example = "127.0.0.1")
    private String ip;

    @Schema(description = "状态：visible/hidden/deleted", example = "visible")
    private String status;

    @Schema(description = "管理员回复内容")
    private String adminReply;

    @Schema(description = "回复时间")
    private LocalDateTime replyAt;

    @Schema(description = "回复人", example = "admin")
    private String replyBy;

    @Schema(description = "创建时间")
    private LocalDateTime createdAt;

    @Schema(description = "更新时间")
    private LocalDateTime updatedAt;

    public static AdminFeedbackDetail from(FeedbackMessage entity) {
        if (entity == null) {
            return null;
        }
        AdminFeedbackDetail detail = new AdminFeedbackDetail();
        detail.setId(entity.getId());
        detail.setContent(escapeHtml(entity.getContent()));
        detail.setNickname(escapeHtml(entity.getNickname()));
        detail.setContact(escapeHtml(entity.getContact()));
        detail.setIp(entity.getIp());
        detail.setStatus(entity.getStatus());
        detail.setAdminReply(escapeHtml(entity.getAdminReply()));
        detail.setReplyAt(entity.getReplyAt());
        detail.setReplyBy(escapeHtml(entity.getReplyBy()));
        detail.setCreatedAt(entity.getCreatedAt());
        detail.setUpdatedAt(entity.getUpdatedAt());
        return detail;
    }

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
