package com.panzipool.api.web.ad.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 管理后台广告信息 DTO（ad_promotion 表全字段）。
 *
 * <p>与面向 C 端的 {@link AdResponse}（仅暴露展示三要素）不同，
 * 该 DTO 供管理后台列表/详情/编辑使用，包含联盟、推广位、有效期、启用标志等全部配置字段。</p>
 */
@Schema(description = "管理后台广告信息")
@Data
public class AdAdminDTO {

    @Schema(description = "广告ID")
    private Long id;

    @Schema(description = "广告联盟", example = "淘宝联盟")
    private String adUnion;

    @Schema(description = "联盟标识", example = "pub.alimama.com")
    private String adUnionSymbol;

    @Schema(description = "推广位名称", example = "首页中部横幅广告")
    private String adPlacement;

    @Schema(description = "推广位ID", example = "mm_10463602253_3429100")
    private String pid;

    @Schema(description = "商品描述（广告展示文案）")
    private String productDescription;

    @Schema(description = "商品图片URL")
    private String productUrl;

    @Schema(description = "广告链接（点击跳转URL）")
    private String adUrl;

    @Schema(description = "广告开始时间")
    private LocalDateTime adStart;

    @Schema(description = "广告结束时间")
    private LocalDateTime adEnd;

    @Schema(description = "是否启用")
    private Boolean adEnabled;

    @Schema(description = "广告投放位置描述", example = "网站首页中部广告位")
    private String adLocation;

    @Schema(description = "投放位置标识", example = "home_middle")
    private String adLocationSymbol;

    @Schema(description = "创建时间")
    private LocalDateTime createdAt;

    @Schema(description = "更新时间")
    private LocalDateTime updatedAt;
}
