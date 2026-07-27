package com.panzipool.api.web.ad.entity;

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
 * 广告推广实体（ad_promotion 表）。
 */
@Schema(description = "广告推广")
@Data
@EqualsAndHashCode(of = "id")
@Entity
@Table(name = "ad_promotion")
@EntityListeners(AuditingEntityListener.class)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AdPromotion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Schema(description = "广告联盟", example = "淘宝联盟")
    @Column(name = "ad_union", nullable = false, length = 32)
    private String adUnion;

    @Schema(description = "联盟标识", example = "pub.alimama.com")
    @Column(name = "ad_union_symbol", nullable = false, length = 128)
    private String adUnionSymbol;

    @Schema(description = "推广位名称", example = "首页中部横幅广告")
    @Column(name = "ad_placement", nullable = false, length = 32)
    private String adPlacement;

    @Schema(description = "推广位ID", example = "mm_10463602253_3429100")
    @Column(name = "pid", nullable = false, length = 64)
    private String pid;

    @Schema(description = "商品描述（广告展示文案）", example = "阿里云轻量云服务器｜建站、程序测试优选，到手68元起")
    @Column(name = "product_description", nullable = false, length = 128)
    private String productDescription;

    @Schema(description = "商品图片URL（广告展示图片）", example = "https://example.com/image.jpg")
    @Column(name = "product_url", nullable = false, length = 256)
    private String productUrl;

    @Schema(description = "广告链接（点击跳转URL）", example = "https://s.click.taobao.com/xxx")
    @Column(name = "ad_url", nullable = false, length = 256)
    private String adUrl;

    @Schema(description = "广告开始日期")
    @Column(name = "ad_start", nullable = false)
    private LocalDateTime adStart;

    @Schema(description = "广告到期日期")
    @Column(name = "ad_end", nullable = false)
    private LocalDateTime adEnd;

    @Schema(description = "广告启用标志", example = "true")
    @Column(name = "ad_enabled", nullable = false)
    private Boolean adEnabled = true;

    @Schema(description = "广告投放位置描述", example = "网站首页中部广告位")
    @Column(name = "ad_location", nullable = false, length = 32)
    private String adLocation;

    @Schema(description = "投放位置标识", example = "home_middle")
    @Column(name = "ad_location_symbol", nullable = false, length = 32)
    private String adLocationSymbol;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}