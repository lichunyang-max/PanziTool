package com.panzipool.api.web.ad.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 广告新增 / 编辑请求 DTO。
 *
 * <p>创建与更新共用同一请求体；id 由路径参数携带，不在请求体中。</p>
 */
@Schema(description = "广告新增/编辑请求")
@Data
public class AdSaveRequest {

    @Schema(description = "广告联盟", example = "淘宝联盟")
    @NotBlank(message = "广告联盟不能为空")
    @Size(max = 32, message = "广告联盟长度不能超过 32 个字符")
    private String adUnion;

    @Schema(description = "联盟标识", example = "pub.alimama.com")
    @NotBlank(message = "联盟标识不能为空")
    @Size(max = 128, message = "联盟标识长度不能超过 128 个字符")
    private String adUnionSymbol;

    @Schema(description = "推广位名称", example = "首页中部横幅广告")
    @NotBlank(message = "推广位名称不能为空")
    @Size(max = 32, message = "推广位名称长度不能超过 32 个字符")
    private String adPlacement;

    @Schema(description = "推广位ID", example = "mm_10463602253_3429100")
    @NotBlank(message = "推广位ID不能为空")
    @Size(max = 64, message = "推广位ID长度不能超过 64 个字符")
    private String pid;

    @Schema(description = "商品描述（广告展示文案）", example = "阿里云轻量云服务器｜建站、程序测试优选，到手68元起")
    @NotBlank(message = "商品描述不能为空")
    @Size(max = 128, message = "商品描述长度不能超过 128 个字符")
    private String productDescription;

    @Schema(description = "商品图片URL（广告展示图片）", example = "https://example.com/image.jpg")
    @NotBlank(message = "商品图片不能为空")
    @Size(max = 256, message = "商品图片URL长度不能超过 256 个字符")
    private String productUrl;

    @Schema(description = "广告链接（点击跳转URL）", example = "https://s.click.taobao.com/xxx")
    @NotBlank(message = "广告链接不能为空")
    @Size(max = 256, message = "广告链接长度不能超过 256 个字符")
    private String adUrl;

    @Schema(description = "广告开始时间（ISO-8601，如 2026-09-18T00:00）")
    @NotNull(message = "广告开始时间不能为空")
    private LocalDateTime adStart;

    @Schema(description = "广告结束时间（ISO-8601，如 2026-10-18T23:59）")
    @NotNull(message = "广告结束时间不能为空")
    private LocalDateTime adEnd;

    @Schema(description = "是否启用", example = "true")
    @NotNull(message = "启用标志不能为空")
    private Boolean adEnabled;

    @Schema(description = "广告投放位置描述", example = "网站首页中部广告位")
    @NotBlank(message = "投放位置不能为空")
    @Size(max = 32, message = "投放位置描述长度不能超过 32 个字符")
    private String adLocation;

    @Schema(description = "投放位置标识", example = "home_middle")
    @NotBlank(message = "投放位置标识不能为空")
    @Size(max = 32, message = "投放位置标识长度不能超过 32 个字符")
    private String adLocationSymbol;
}
