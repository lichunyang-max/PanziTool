package com.panzipool.api.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 统一响应信封格式。
 *
 * <p>成功响应：{@code {"code": 0, "data": {...}}}</p>
 * <p>失败响应：{@code {"code": <业务错误码>, "message": "<友好提示>"}}</p>
 *
 * <p>使用 {@code @JsonInclude(NON_NULL)} 保证成功响应不序列化 {@code message}，
 * 失败响应不序列化 {@code data}，使信封格式干净一致。</p>
 *
 * @param <T> data 载荷类型
 */
@Schema(description = "统一响应信封")
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    @Schema(description = "业务码：0 表示成功，非 0 表示失败", example = "0")
    private final int code;

    @Schema(description = "成功时返回的数据载荷，失败时为 null")
    private final T data;

    @Schema(description = "失败时的友好提示，成功时为 null", example = "参数校验失败")
    private final String message;

    private ApiResponse(int code, T data, String message) {
        this.code = code;
        this.data = data;
        this.message = message;
    }

    /**
     * 构造成功响应（携带数据）。
     */
    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(ApiConstants.CODE_SUCCESS, data, null);
    }

    /**
     * 构造成功响应（无数据载荷）。
     */
    public static <T> ApiResponse<T> success() {
        return new ApiResponse<>(ApiConstants.CODE_SUCCESS, null, null);
    }

    /**
     * 构造失败响应。
     *
     * @param code    业务错误码
     * @param message 友好提示
     */
    public static <T> ApiResponse<T> error(int code, String message) {
        return new ApiResponse<>(code, null, message);
    }

    /**
     * 构造失败响应（携带附加数据）。
     *
     * <p>适用于冲突等场景需要返回当前状态供前端同步的响应，例如重复点赞时返回
     * 当前 like_count：</p>
     * <pre>{@code
     * {"code": 409, "message": "您已经点过赞了", "data": {"like_count": 5, "liked": false}}
     * }</pre>
     *
     * @param code    业务错误码
     * @param message 友好提示
     * @param data    附加数据（如冲突时的当前计数），可为 null
     */
    public static <T> ApiResponse<T> error(int code, String message, T data) {
        return new ApiResponse<>(code, data, message);
    }

    public int getCode() {
        return code;
    }

    public T getData() {
        return data;
    }

    public String getMessage() {
        return message;
    }
}
