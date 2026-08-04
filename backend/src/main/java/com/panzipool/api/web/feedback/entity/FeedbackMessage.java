package com.panzipool.api.web.feedback.entity;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 意见反馈留言实体（feedback_messages 表）。
 */
@Schema(description = "意见反馈留言")
@Data
@EqualsAndHashCode(of = "id")
@Entity
@Table(name = "feedback_messages")
@EntityListeners(AuditingEntityListener.class)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class FeedbackMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Schema(description = "反馈内容", example = "希望增加一个 JSON 比对工具")
    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Schema(description = "昵称", example = "匿名用户")
    @Column(name = "nickname", length = 30)
    private String nickname;

    @Schema(description = "联系方式", example = "user@example.com")
    @Column(name = "contact", length = 100)
    private String contact;

    @Schema(description = "提交者 IP", example = "127.0.0.1")
    @Column(name = "ip", length = 45)
    private String ip;

    @Schema(description = "状态：visible / hidden", example = "visible")
    @Column(name = "status", nullable = false, length = 20)
    private String status = "visible";

    @Schema(description = "管理员回复内容")
    @Column(name = "admin_reply", columnDefinition = "TEXT")
    private String adminReply;

    @Schema(description = "回复时间")
    @Column(name = "reply_at")
    private LocalDateTime replyAt;

    @Schema(description = "回复人")
    @Column(name = "reply_by", length = 50)
    private String replyBy;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
