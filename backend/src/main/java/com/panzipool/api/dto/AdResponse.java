package com.panzipool.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 广告响应 DTO。
 *
 * <p>用于返回广告信息给前端，包含广告描述、图片地址和跳转地址。
 * JSON 字段使用 snake_case 命名，与前端 API 契约一致。</p>
 */
@Schema(description = "广告信息")
public class AdResponse {

    @Schema(description = "广告描述", example = "阿里云轻量云服务器｜建站、程序测试优选，到手68元起")
    @JsonProperty("product_description")
    private final String productDescription;

    @Schema(description = "广告图片地址", example = "https://example.com/image.jpg")
    @JsonProperty("product_url")
    private final String productUrl;

    @Schema(description = "广告跳转地址", example = "https://s.click.taobao.com/xxx")
    @JsonProperty("ad_url")
    private final String adUrl;

    public AdResponse(String productDescription, String productUrl, String adUrl) {
        this.productDescription = productDescription;
        this.productUrl = productUrl;
        this.adUrl = adUrl;
    }

    @JsonProperty("product_description")
    public String getProductDescription() {
        return productDescription;
    }

    @JsonProperty("product_url")
    public String getProductUrl() {
        return productUrl;
    }

    @JsonProperty("ad_url")
    public String getAdUrl() {
        return adUrl;
    }
}
