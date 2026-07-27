package com.panzipool.api.web.ping.controller;

import com.panzipool.api.common.ApiConstants;
import com.panzipool.api.common.ApiResponse;
import com.panzipool.api.common.BusinessException;
import com.panzipool.api.web.ping.dto.DemoRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 示例控制器，用于验证统一响应信封格式、全局异常处理、JSR-303 校验是否生效。
 *
 * <p>所有路径自动携带 {@code /api/v1} 前缀（由 {@code server.servlet.context-path} 配置），
 * 因此实际访问路径为 {@code /api/v1/ping}、{@code /api/v1/ping/echo} 等。</p>
 */
@Tag(name = "Ping", description = "健康探针与示例接口（验证基础设施）")
@RestController
@RequestMapping("/ping")
@Validated
public class PingController {

    @Operation(summary = "探针", description = "返回 pong，验证统一成功响应格式")
    @GetMapping
    public ApiResponse<String> ping() {
        return ApiResponse.success("pong");
    }

    @Operation(summary = "回显（校验请求体）", description = "演示 @Valid + @RequestBody 校验")
    @PostMapping("/echo")
    public ApiResponse<DemoRequest> echo(@Valid @RequestBody DemoRequest request) {
        return ApiResponse.success(request);
    }

    @Operation(summary = "回显（校验查询参数）", description = "演示 @Validated + @Pattern 查询参数校验")
    @GetMapping("/greet")
    public ApiResponse<String> greet(
            @RequestParam(name = "name")
            @Pattern(regexp = "^[A-Za-z0-9_-]{1,20}$", message = "name 仅允许字母数字下划线连字符，最长 20")
            String name) {
        return ApiResponse.success("hello, " + name);
    }

    @Operation(summary = "抛出业务异常", description = "演示 BusinessException 被全局异常处理器捕获")
    @GetMapping("/error")
    public ApiResponse<Void> error() {
        throw new BusinessException(ApiConstants.CODE_BAD_REQUEST, "这是一个演示业务异常", HttpStatus.BAD_REQUEST);
    }
}