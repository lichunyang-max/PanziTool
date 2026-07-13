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
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 按天聚合统计实体（tool_event_daily 表）。
 *
 * <p>由 tool_event_logs 原始日志按天聚合而来，每个 (tool_id, event_date, event_type)
 * 组合唯一，count 字段记录当天该事件累计次数。详情页与列表页查询只读此表与 tools 冗余计数，
 * 避免对原始日志表做实时 COUNT。</p>
 *
 * <p>唯一约束 (tool_id, event_date, event_type) 防止重复聚合。</p>
 */
@Schema(description = "按天聚合统计")
@Entity
@Table(
        name = "tool_event_daily",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_tool_event_daily_tool_date_type",
                columnNames = {"tool_id", "event_date", "event_type"}
        )
)
@EntityListeners(AuditingEntityListener.class)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ToolEventDaily {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Schema(description = "工具 ID（page_view 事件可为 null）", example = "1")
    @Column(name = "tool_id")
    private Long toolId;

    @Schema(description = "事件日期", example = "2026-07-12")
    @Column(name = "event_date", nullable = false)
    private LocalDate eventDate;

    @Schema(description = "事件类型：page_view / tool_use / copy / download", example = "tool_use")
    @Column(name = "event_type", nullable = false, length = 30)
    private String eventType;

    @Schema(description = "当天该事件计数", example = "42")
    @Column(name = "count", nullable = false)
    private Long count = 0L;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

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

    public LocalDate getEventDate() {
        return eventDate;
    }

    public void setEventDate(LocalDate eventDate) {
        this.eventDate = eventDate;
    }

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public Long getCount() {
        return count;
    }

    public void setCount(Long count) {
        this.count = count;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
