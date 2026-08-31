package com.panzipool.api.web.resource.service;

import com.panzipool.api.config.MinioProperties;
import com.panzipool.api.common.BusinessException;
import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.SetBucketPolicyArgs;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

/**
 * MinIO 对象存储服务：资源站图片上传。
 *
 * <p>启动时确保存储桶存在并设置为公开读（仅允许匿名 GET 对象）；
 * 上传时校验文件类型与大小，对象名按 {@code resources/{日期}/{uuid}.{ext}} 组织，
 * 返回基于 {@code publicUrl} 前缀拼接的公开访问 URL。</p>
 */
@Service
public class MinioStorageService {

    private static final Logger log = LoggerFactory.getLogger(MinioStorageService.class);

    /** 允许上传的图片扩展名白名单 */
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "jpg", "jpeg", "png", "gif", "webp", "svg", "ico", "bmp");

    /** 单文件大小上限：5MB */
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024L;

    private final MinioClient minioClient;
    private final MinioProperties properties;

    public MinioStorageService(MinioClient minioClient, MinioProperties properties) {
        this.minioClient = minioClient;
        this.properties = properties;
    }

    /**
     * 启动时确保存储桶存在；不存在则创建并设置公开读策略。
     *
     * <p>MinIO 不可达时仅记录告警不阻断启动（上传时再报错），避免数据库/存储
     * 依赖阻塞主服务。</p>
     */
    @PostConstruct
    void ensureBucket() {
        try {
            String bucket = properties.getBucket();
            boolean exists = minioClient.bucketExists(
                    BucketExistsArgs.builder().bucket(bucket).build());
            if (!exists) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
                log.info("MinIO 存储桶不存在，已创建: {}", bucket);
            }
            applyPublicReadPolicy(bucket);
            log.info("MinIO 初始化完成: endpoint={}, bucket={}", properties.getEndpoint(), bucket);
        } catch (Exception e) {
            log.warn("MinIO 初始化失败（上传功能暂不可用）: {}", e.getMessage());
        }
    }

    /**
     * 上传图片文件，返回公开访问 URL。
     *
     * @param file 前端上传的图片文件
     * @return 公开访问 URL（publicUrl + "/" + objectName）
     * @throws BusinessException 文件为空 / 超限 / 类型不允许 / 上传失败
     */
    public String uploadImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(400, "请选择要上传的图片文件", HttpStatus.BAD_REQUEST);
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BusinessException(400, "图片大小不能超过 5MB", HttpStatus.BAD_REQUEST);
        }

        String original = file.getOriginalFilename() == null ? "" : file.getOriginalFilename();
        String ext = extractExtension(original);
        if (ext.isBlank() || !ALLOWED_EXTENSIONS.contains(ext)) {
            throw new BusinessException(400,
                    "不支持的图片格式，允许：jpg/jpeg/png/gif/webp/svg/ico/bmp", HttpStatus.BAD_REQUEST);
        }

        String datePath = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String objectName = "resources/" + datePath + "/" + UUID.randomUUID().toString().replace("-", "") + "." + ext;

        try {
            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(properties.getBucket())
                    .object(objectName)
                    .stream(file.getInputStream(), file.getSize(), -1)
                    .contentType(resolveContentType(ext))
                    .build());
        } catch (Exception e) {
            log.error("MinIO 图片上传失败: {}", e.getMessage(), e);
            throw new BusinessException(500, "图片上传失败，请稍后重试", HttpStatus.INTERNAL_SERVER_ERROR);
        }

        String url = buildPublicUrl(objectName);
        log.info("图片上传成功: {} -> {}", original, url);
        return url;
    }

    private String buildPublicUrl(String objectName) {
        String base = properties.getPublicUrl();
        if (base == null || base.isBlank()) {
            base = properties.getEndpoint() + "/" + properties.getBucket();
        }
        return base.endsWith("/") ? base + objectName : base + "/" + objectName;
    }

    private String extractExtension(String filename) {
        int dot = filename.lastIndexOf('.');
        if (dot < 0 || dot == filename.length() - 1) {
            return "";
        }
        return filename.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    private String resolveContentType(String ext) {
        return switch (ext) {
            case "jpg", "jpeg" -> "image/jpeg";
            case "png" -> "image/png";
            case "gif" -> "image/gif";
            case "webp" -> "image/webp";
            case "svg" -> "image/svg+xml";
            case "ico" -> "image/x-icon";
            case "bmp" -> "image/bmp";
            default -> "application/octet-stream";
        };
    }

    /**
     * 为存储桶设置匿名只读策略（允许公开 GET 对象）。
     */
    private void applyPublicReadPolicy(String bucket) throws Exception {
        String policy = """
                {
                  "Version": "2012-10-17",
                  "Statement": [
                    {
                      "Effect": "Allow",
                      "Principal": {"AWS": ["*"]},
                      "Action": ["s3:GetObject"],
                      "Resource": ["arn:aws:s3:::%s/*"]
                    }
                  ]
                }
                """.formatted(bucket);
        minioClient.setBucketPolicy(
                SetBucketPolicyArgs.builder().bucket(bucket).config(policy).build());
    }
}
