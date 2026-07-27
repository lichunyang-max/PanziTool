package com.panzipool.api.web.ad.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * 广告响应 DTO。
 */
@Schema(description = "广告信息")
@Data
@AllArgsConstructor
public class AdResponse {

    @Schema(description = "广告描述", example = "阿里云轻量云服务器｜建站、程序测试优选，到手68元起")
    @JsonProperty("product_description")
    private String productDescription;

    @Schema(description = "广告图片地址", example = "https://example.com/image.jpg")
    @JsonProperty("product_url")
    private String productUrl;

    @Schema(description = "广告跳转地址", example = "https://s.click.taobao.com/xxx")
    @JsonProperty("ad_url")
    private String adUrl;
}