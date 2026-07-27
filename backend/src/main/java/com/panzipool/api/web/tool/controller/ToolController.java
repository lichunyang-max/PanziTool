package com.panzipool.api.web.tool.controller;

import com.panzipool.api.common.ApiConstants;
import com.panzipool.api.common.ApiResponse;
import com.panzipool.api.web.tool.dto.LikeRequest;
import com.panzipool.api.web.tool.dto.LikeResponse;
import com.panzipool.api.web.tool.dto.ToolDetailDTO;
import com.panzipool.api.web.tool.dto.ToolListResponse;
import com.panzipool.api.web.tool.service.LikeService;
import com.panzipool.api.web.tool.service.ToolService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 工具控制器。
 *
 * <p>所有路径自动携带 {@code /api/v1} 前缀（由 {@code server.servlet.context-path} 配置），
 * 因此 {@code @RequestMapping("/tools")} 对应实际路径 {@code /api/v1/tools}。</p>
 *
 * <p>提供以下接口：</p>
 * <ul>
 *   <li>{@code GET /tools} —— 工具列表（支持分类筛选、热门/最新排序、分页）</li>
 *   <li>{@code GET /tools/{slug}} —— 工具详情（含 use_count / like_count 冗余计数）</li>
 *   <li>{@code POST /tools/{slug}/like} —— 点赞（同一 anon_id 仅一次，不可取消）</li>
 * </ul>
 */
@Tag(name = "Tools", description = "工具元数据、计数查询与点赞")
@RestController
@RequestMapping("/tools")
@Validated
public class ToolController {

    private final LikeService likeService;
    private final ToolService toolService;

    public ToolController(LikeService likeService, ToolService toolService) {
        this.likeService = likeService;
        this.toolService = toolService;
    }

    /**
     * 工具列表接口（支持分类筛选、热门/最新排序、分页）。
     */
    @Operation(summary = "工具列表", description = "查询工具列表，支持分类筛选、热门/最新排序与分页")
    @GetMapping
    public ApiResponse<ToolListResponse> listTools(
            @Parameter(description = "分类筛选：developer / image") @RequestParam(required = false) String category,
            @Parameter(description = "排序方式：popular（默认）/ latest") @RequestParam(required = false) String sort,
            @Parameter(description = "返回数量限制，默认 50") @RequestParam(required = false) Integer limit,
            @Parameter(description = "分页偏移，默认 0") @RequestParam(required = false) Integer offset) {
        return ApiResponse.success(toolService.getTools(category, sort, limit, offset));
    }

    /**
     * 工具详情接口（含 use_count / like_count 冗余计数）。
     */
    @Operation(summary = "工具详情", description = "按 slug 查询工具详情，含使用次数与点赞次数冗余计数")
    @GetMapping("/{slug}")
    public ApiResponse<ToolDetailDTO> getTool(
            @Parameter(description = "工具 slug", example = "json-formatter", required = true)
            @PathVariable String slug) {
        return ApiResponse.success(toolService.getToolBySlug(slug));
    }

    /**
     * 点赞接口：匿名用户对工具点赞（同一 anon_id 仅一次，不可取消）。
     *
     * <p>响应语义：</p>
     * <ul>
     *   <li>首次点赞：HTTP 200 + {@code {"code": 0, "data": {"like_count": N, "liked": true}}}</li>
     *   <li>重复点赞：HTTP 409 + {@code {"code": 409, "message": "您已经点过赞了",
     *       "data": {"like_count": N, "liked": false}}}（data 携带当前 like_count 供前端同步）</li>
     *   <li>工具不存在：HTTP 404 + {@code {"code": 404, "message": "工具不存在或已下线"}}</li>
     * </ul>
     */
    @Operation(summary = "点赞", description = "匿名用户对工具点赞，同一 anon_id 对同一工具仅能点赞一次且不可取消")
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
            description = "点赞请求体", required = true,
            content = @io.swagger.v3.oas.annotations.media.Content(
                    mediaType = "application/json",
                    schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = LikeRequest.class)))
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "首次点赞成功"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "参数校验失败（anon_id 为空或非 UUID 格式）"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "工具不存在"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "409", description = "重复点赞（已点过赞）")
    })
    @PostMapping("/{slug}/like")
    public ResponseEntity<ApiResponse<LikeResponse>> like(
            @Parameter(description = "工具 slug", example = "json-formatter", required = true)
            @PathVariable @NotBlank(message = "slug 不能为空") String slug,
            @Valid @RequestBody LikeRequest request) {

        LikeResponse response = likeService.like(slug, request.getAnonId());

        if (response.isLiked()) {
            return ResponseEntity.ok(ApiResponse.success(response));
        } else {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiResponse.error(ApiConstants.CODE_CONFLICT, "您已经点过赞了", response));
        }
    }
}