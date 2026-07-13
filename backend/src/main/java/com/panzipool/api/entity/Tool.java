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
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 工具元数据实体（tools 表）。
 *
 * <p>存储工具的基础信息与冗余计数字段（use_count / like_count），
 * 详情页与列表页直接读取冗余计数，避免实时 COUNT 聚合。</p>
 *
 * <p>slug 全局唯一，作为工具详情页 URL 标识；
 * (category, use_count) 复合索引支持分类页按热门排序。</p>
 */
@Schema(description = "工具元数据")
@Entity
@Table(name = "tools")
@EntityListeners(AuditingEntityListener.class)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Tool {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Schema(description = "URL 友好标识，全局唯一", example = "json-formatter")
    @Column(name = "slug", nullable = false, unique = true, length = 100)
    private String slug;

    @Schema(description = "工具显示名称", example = "JSON 格式化")
    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Schema(description = "分类：developer / image", example = "developer")
    @Column(name = "category", nullable = false, length = 50)
    private String category;

    @Schema(description = "关键词，逗号分隔，用于搜索匹配", example = "json,格式化,校验,压缩")
    @Column(name = "keywords", length = 500)
    private String keywords;

    @Schema(description = "工具描述", example = "JSON 格式化/压缩/校验工具")
    @Column(name = "description", length = 1000)
    private String description;

    @Schema(description = "启用标志", example = "true")
    @Column(name = "enabled", nullable = false)
    private Boolean enabled = true;

    @Schema(description = "使用次数（冗余计数）", example = "0")
    @Column(name = "use_count", nullable = false)
    private Long useCount = 0L;

    @Schema(description = "点赞次数（冗余计数）", example = "0")
    @Column(name = "like_count", nullable = false)
    private Long likeCount = 0L;

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

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getKeywords() {
        return keywords;
    }

    public void setKeywords(String keywords) {
        this.keywords = keywords;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Boolean getEnabled() {
        return enabled;
    }

    public void setEnabled(Boolean enabled) {
        this.enabled = enabled;
    }

    public Long getUseCount() {
        return useCount;
    }

    public void setUseCount(Long useCount) {
        this.useCount = useCount;
    }

    public Long getLikeCount() {
        return likeCount;
    }

    public void setLikeCount(Long likeCount) {
        this.likeCount = likeCount;
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
