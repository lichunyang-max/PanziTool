package com.panzipool.api.web.resource.entity;

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
 * 资源目录实体（resource_categories 表）。
 *
 * <p>支持两级层级：{@code parentId} 为空表示一级目录（如"办公文档模板"），
 * 非空表示其下的二级目录（如 word / excel / ppt）。</p>
 */
@Schema(description = "资源目录")
@Data
@EqualsAndHashCode(of = "id")
@Entity
@Table(name = "resource_categories")
@EntityListeners(AuditingEntityListener.class)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ResourceCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Schema(description = "目录名称", example = "办公文档模板")
    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Schema(description = "父目录 ID，空表示一级目录", example = "1")
    @Column(name = "parent_id")
    private Long parentId;

    @Schema(description = "排序号，越小越靠前", example = "0")
    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
