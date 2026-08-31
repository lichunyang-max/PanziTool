package com.panzipool.api.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * MinIO 对象存储配置属性。
 *
 * <p>绑定 {@code panzipool.minio.*} 配置项，用于资源站图片上传与公开访问。</p>
 *
 * @param endpoint   MinIO S3 API 地址（注意：9000 通常是 API 端口，9001 是控制台端口）
 * @param accessKey  访问账号
 * @param secretKey  访问密钥
 * @param bucket     存储桶名称
 * @param publicUrl  生成公开访问 URL 的前缀（线上可通过 Nginx 反代 MinIO，
 *                   如 https://resource.panzi.com/minio/panzipool）
 */
@Data
@ConfigurationProperties(prefix = "panzipool.minio")
public class MinioProperties {

    private String endpoint = "http://localhost:9000";

    private String accessKey = "admin";

    private String secretKey = "";

    private String bucket = "panzipool";

    private String publicUrl = "http://localhost:9000/panzipool";
}
