package com.panzipool.api.entity;

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
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 点赞记录实体（tool_likes 表）。
 *
 * <p>记录匿名用户对工具的点赞行为。唯一约束 (tool_id, anon_id, like_date) 确保同一匿名用户
 * 对同一工具每个自然天仅能点赞一次且不可取消。点赞成功后同步更新 tools.like_count 冗余计数。</p>
 *
 * <p>局限性：anon_id 由客户端 localStorage 生成，可被清除/伪造；MVP 防刷为基础级
 * （同设备每自然天一次），不抵御恶意伪造。</p>
 */
@Schema(description = "点赞记录")
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

    // --- Getters & Setters ---

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getToolId() {
        return toolId;
    }

    public void setToolId(Long toolId) {
        this.toolId = toolId;
    }

    public String getAnonId() {
        return anonId;
    }

    public void setAnonId(String anonId) {
        this.anonId = anonId;
    }

    public LocalDate getLikeDate() {
        return likeDate;
    }

    public void setLikeDate(LocalDate likeDate) {
        this.likeDate = likeDate;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
