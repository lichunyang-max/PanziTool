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
 * 资源条目实体（resource_items 表）。
 *
 * <p>每个资源归属一个目录（通常是二级目录），包含名称、跳转链接与图标图片
 * 三个核心字段；图片存储在 MinIO，{@code image} 字段保存其公开访问 URL，
 * 为空时前端展示默认图标。</p>
 */
@Schema(description = "资源条目")
@Data
@EqualsAndHashCode(of = "id")
@Entity
@Table(name = "resource_items")
@EntityListeners(AuditingEntityListener.class)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ResourceItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Schema(description = "所属目录 ID", example = "2")
    @Column(name = "category_id", nullable = false)
    private Long categoryId;

    @Schema(description = "资源名称", example = "简历模板")
    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Schema(description = "跳转链接", example = "https://example.com/resume")
    @Column(name = "url", nullable = false, length = 500)
    private String url;

    @Schema(description = "图标图片 URL（MinIO），为空时前端使用默认图标")
    @Column(name = "image", length = 500)
    private String image;

    @Schema(description = "资源描述，鼠标悬停卡片时展示", example = "精选 20 套简历模板，涵盖各行业")
    @Column(name = "description", length = 500)
    private String description;

    @Schema(description = "下载次数（点击跳转即计一次）", example = "0")
    @Column(name = "download_count", nullable = false)
    private Long downloadCount = 0L;

    @Schema(description = "点赞次数（同一匿名用户仅一次）", example = "0")
    @Column(name = "like_count", nullable = false)
    private Long likeCount = 0L;

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
