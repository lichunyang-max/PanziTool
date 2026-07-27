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
import jakarta.persistence.UniqueConstraint;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 站点日统计实体（site_visitor_daily 表）。
 */
@Schema(description = "站点日统计")
@Data
@EqualsAndHashCode(of = "id")
@Entity
@Table(
        name = "site_visitor_daily",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_site_visitor_daily_stat_date",
                columnNames = {"stat_date"}
        )
)
@EntityListeners(AuditingEntityListener.class)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SiteVisitorDaily {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Schema(description = "统计日期", example = "2026-07-12")
    @Column(name = "stat_date", nullable = false)
    private LocalDate statDate;

    @Schema(description = "页面浏览量（PV）", example = "1024")
    @Column(name = "pv", nullable = false)
    private Long pv = 0L;

    @Schema(description = "独立访客数（UV，按 anon_id 去重）", example = "256")
    @Column(name = "uv", nullable = false)
    private Long uv = 0L;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}