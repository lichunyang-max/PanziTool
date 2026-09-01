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
import jakarta.persistence.UniqueConstraint;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 资源点赞记录实体（resource_likes 表）。
 *
 * <p>以 {@code (item_id, anon_id)} 唯一约束实现防刷：同一匿名用户
 * （客户端 localStorage 生成 UUID）对同一资源仅能点赞一次且不可取消。</p>
 */
@Schema(description = "资源点赞记录")
@Data
@EqualsAndHashCode(of = "id")
@Entity
@Table(name = "resource_likes", uniqueConstraints = {
        @UniqueConstraint(name = "uk_resource_like_item_anon", columnNames = {"item_id", "anon_id"})
})
@EntityListeners(AuditingEntityListener.class)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ResourceLike {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Schema(description = "资源 ID", example = "1")
    @Column(name = "item_id", nullable = false)
    private Long itemId;

    @Schema(description = "匿名用户 ID（UUID，客户端 localStorage 生成）")
    @Column(name = "anon_id", nullable = false, length = 64)
    private String anonId;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
