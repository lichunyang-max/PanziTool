package com.panzipool.api.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 本地文件上传配置属性。
 *
 * <p>绑定 {@code panzipool.upload.*} 配置项，用于管理后台图片的本地磁盘存储
 * 与公开访问 URL 拼接。</p>
 *
 * @param dir       本地存储根目录（物理路径，可为相对工作目录的相对路径）；
 *                  开发环境建议指向前端静态目录，生产环境指向 Nginx 站点目录
 * @param urlPrefix 对外访问 URL 前缀，默认 {@code /images}（由前端静态服务或 Nginx 提供）
 */
@Data
@ConfigurationProperties(prefix = "panzipool.upload")
public class UploadProperties {

    private String dir = "./uploads";

    private String urlPrefix = "/images";
}
