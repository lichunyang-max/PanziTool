package com.panzipool.api.web.resource.controller;

import com.panzipool.api.common.ApiResponse;
import com.panzipool.api.common.BusinessException;
import com.panzipool.api.web.resource.service.LocalFileStorageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.Set;

/**
 * 管理后台图片上传控制器（/admin/upload，受 AdminAuthInterceptor 保护）。
 *
 * <p>接收 multipart 图片文件，保存到服务器本地磁盘并返回公开访问 URL。</p>
 */
@Tag(name = "Admin Upload", description = "管理后台图片上传（本地磁盘）")
@RestController
@RequestMapping("/admin")
public class AdminUploadController {

    /** 允许的存储子目录白名单（对应 URL /images/{子目录}） */
    private static final Set<String> ALLOWED_FOLDERS = Set.of("ad", "resources");

    private final LocalFileStorageService storageService;

    public AdminUploadController(LocalFileStorageService storageService) {
        this.storageService = storageService;
    }

    @Operation(summary = "上传图片", description = "multipart 上传图片至服务器本地磁盘，返回公开访问 URL；限制 5MB，支持 jpg/png/gif/webp/svg/ico/bmp")
    @PostMapping("/upload")
    public ApiResponse<Map<String, String>> upload(
            @Parameter(description = "图片文件", required = true) @RequestParam("file") MultipartFile file,
            @Parameter(description = "存储子目录：ad（默认）/ resources") @RequestParam(value = "folder", defaultValue = "ad") String folder) {
        if (!ALLOWED_FOLDERS.contains(folder)) {
            throw new BusinessException(400, "不支持的上传目录", HttpStatus.BAD_REQUEST);
        }
        String url = storageService.uploadImage(file, folder);
        return ApiResponse.success(Map.of("url", url));
    }
}
