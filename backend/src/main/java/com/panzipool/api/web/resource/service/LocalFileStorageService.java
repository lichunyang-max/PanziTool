package com.panzipool.api.web.resource.service;

import com.panzipool.api.common.BusinessException;
import com.panzipool.api.config.UploadProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

/**
 * 本地磁盘图片存储服务：管理后台图片上传。
 *
 * <p>文件按 {@code {子目录}/{日期}/{uuid}.{ext}} 组织在配置根目录下，
 * 返回基于 {@code urlPrefix} 前缀拼接的公开访问 URL（如
 * {@code /images/ad/20260919/xxxx.jpg}），由前端静态服务或 Nginx 提供访问。</p>
 */
@Service
public class LocalFileStorageService {

    private static final Logger log = LoggerFactory.getLogger(LocalFileStorageService.class);

    /** 允许上传的图片扩展名白名单 */
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "jpg", "jpeg", "png", "gif", "webp", "svg", "ico", "bmp");

    /** 单文件大小上限：5MB */
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024L;

    private final UploadProperties properties;

    public LocalFileStorageService(UploadProperties properties) {
        this.properties = properties;
    }

    /**
     * 上传图片文件到本地磁盘，返回公开访问 URL。
     *
     * @param file   前端上传的图片文件
     * @param subdir 存储子目录（如 ad / resources，需由调用方保证合法）
     * @return 公开访问 URL（urlPrefix + "/" + 相对对象路径）
     * @throws BusinessException 文件为空 / 超限 / 类型不允许 / 写入失败
     */
    public String uploadImage(MultipartFile file, String subdir) {
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
        // 物理相对路径与 URL 路径保持一致：{urlPrefix}/{subdir}/{date}/{file}
        String prefixSegment = stripLeadingSlash(properties.getUrlPrefix());
        String objectName = (prefixSegment.isBlank() ? "" : prefixSegment + "/")
                + subdir + "/" + datePath + "/"
                + UUID.randomUUID().toString().replace("-", "") + "." + ext;

        Path baseDir = Paths.get(properties.getDir()).toAbsolutePath().normalize();
        Path target = baseDir.resolve(objectName).normalize();
        // 路径穿越防护：目标路径必须位于配置根目录之内
        if (!target.startsWith(baseDir)) {
            throw new BusinessException(400, "非法的存储路径", HttpStatus.BAD_REQUEST);
        }

        try {
            Files.createDirectories(target.getParent());
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException e) {
            log.error("本地图片写入失败: {}, path={}", e.getMessage(), target, e);
            throw new BusinessException(500, "图片上传失败，请检查服务器存储目录", HttpStatus.INTERNAL_SERVER_ERROR);
        }

        String url = "/" + objectName;
        log.info("图片上传成功: {} -> {}", original, url);
        return url;
    }

    /** 去掉 URL 前缀的首尾斜杠，返回用于物理相对路径的目录段（如 "images"）。 */
    private String stripLeadingSlash(String prefix) {
        if (prefix == null) {
            return "";
        }
        String p = prefix.trim();
        while (p.startsWith("/")) {
            p = p.substring(1);
        }
        while (p.endsWith("/")) {
            p = p.substring(0, p.length() - 1);
        }
        return p;
    }

    private String extractExtension(String filename) {
        int dot = filename.lastIndexOf('.');
        if (dot < 0 || dot == filename.length() - 1) {
            return "";
        }
        return filename.substring(dot + 1).toLowerCase(Locale.ROOT);
    }
}
