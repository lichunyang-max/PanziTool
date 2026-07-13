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
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 原始事件日志实体（tool_event_logs 表）。
 *
 * <p>记录每次用户交互的原始事件（page_view / tool_use / copy / download），
 * 后续通过定时任务聚合到 {@link ToolEventDaily} 表。</p>
 *
 * <p>MVP 阶段 tool_id 以 Long 字段存储，不使用 @ManyToOne 关联，
 * 降低复杂度与懒加载代理开销。索引 (tool_id, created_at) 与 (anon_id, created_at)
 * 分别支持按工具/按用户查询事件。</p>
 */
@Schema(description = "原始事件日志")
@Entity
@Table(name = "tool_event_logs")
@EntityListeners(AuditingEntityListener.class)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ToolEventLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Schema(description = "工具 ID（page_view 事件可为 null）", example = "1")
    @Column(name = "tool_id")
    private Long toolId;

    @Schema(description = "匿名用户 ID（UUID）", example = "550e8400-e29b-41d4-a716-446655440000")
    @Column(name = "anon_id", nullable = false, length = 64)
    private String anonId;

    @Schema(description = "事件类型：page_view / tool_use / copy / download", example = "tool_use")
    @Column(name = "event_type", nullable = false, length = 30)
    private String eventType;

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

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
