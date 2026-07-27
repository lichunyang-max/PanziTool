package com.panzipool.api.web.tool.entity;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 点赞记录实体（tool_likes 表）。
 */
@Schema(description = "点赞记录")
@Data
@EqualsAndHashCode(of = "id")
@Entity
@Table(
        name = "tool_likes",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_tool_likes_tool_anon_date",
                columnNames = {"tool_id", "anon_id", "like_date"}
        )
)
@EntityListeners(AuditingEntityListener.class)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ToolLike {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Schema(description = "工具 ID", example = "1")
    @Column(name = "tool_id", nullable = false)
    private Long toolId;

    @Schema(description = "匿名用户 ID（UUID）", example = "550e8400-e29b-41d4-a716-446655440000")
    @Column(name = "anon_id", nullable = false, length = 64)
    private String anonId;

    @Schema(description = "点赞所在自然天", example = "2026-07-15")
    @Column(name = "like_date", nullable = false)
    private LocalDate likeDate;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}