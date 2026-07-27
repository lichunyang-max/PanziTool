package com.panzipool.api.web.event.entity;

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
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 原始事件日志实体（tool_event_logs 表）。
 */
@Schema(description = "原始事件日志")
@Data
@EqualsAndHashCode(of = "id")
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
}