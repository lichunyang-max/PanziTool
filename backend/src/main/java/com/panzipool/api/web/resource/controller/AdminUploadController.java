package com.panzipool.api.web.resource.controller;

import com.panzipool.api.common.ApiResponse;
import com.panzipool.api.web.resource.service.MinioStorageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/**
 * 管理后台图片上传控制器（/admin/upload，受 AdminAuthInterceptor 保护）。
 *
 * <p>接收 multipart 图片文件，上传至 MinIO 并返回公开访问 URL。</p>
 */
@Tag(name = "Admin Upload", description = "管理后台图片上传（MinIO）")
@RestController
@RequestMapping("/admin")
public class AdminUploadController {

    private final MinioStorageService storageService;

    public AdminUploadController(MinioStorageService storageService) {
        this.storageService = storageService;
    }

    @Operation(summary = "上传图片", description = "multipart 上传图片至 MinIO，返回公开访问 URL；限制 5MB，支持 jpg/png/gif/webp/svg/ico/bmp")
    @PostMapping("/upload")
    public ApiResponse<Map<String, String>> upload(@RequestParam("file") MultipartFile file) {
        String url = storageService.uploadImage(file);
        return ApiResponse.success(Map.of("url", url));
    }
}
