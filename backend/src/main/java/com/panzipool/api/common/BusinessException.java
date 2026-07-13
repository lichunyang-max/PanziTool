package com.panzipool.api.common;

import org.springframework.http.HttpStatus;

/**
 * 业务异常。由 {@link com.panzipool.api.exception.GlobalExceptionHandler} 统一捕获，
 * 转换为 {@code code} + {@code message} 的失败响应，并使用 {@code httpStatus} 作为 HTTP 状态码。
 *
 * <p>用法示例：</p>
 * <pre>{@code
 * throw new BusinessException(ApiConstants.CODE_TOOL_NOT_FOUND, "工具不存在", HttpStatus.NOT_FOUND);
 * throw new BusinessException(ApiConstants.CODE_ALREADY_LIKED, "已点赞，不可重复点赞", HttpStatus.CONFLICT);
 * }</pre>
 */
public class BusinessException extends RuntimeException {

    private final int code;
    private final HttpStatus httpStatus;

    /**
     * @param code        业务错误码（建议使用 {@link ApiConstants} 中的常量）
     * @param message     友好提示
     * @param httpStatus  对应的 HTTP 状态码
     */
    public BusinessException(int code, String message, HttpStatus httpStatus) {
        super(message);
        this.code = code;
        this.httpStatus = httpStatus;
    }

    /**
     * 默认 HTTP 状态码为 400 Bad Request 的业务异常。
     */
    public BusinessException(int code, String message) {
        this(code, message, HttpStatus.BAD_REQUEST);
    }

    public int getCode() {
        return code;
    }

    public HttpStatus getHttpStatus() {
        return httpStatus;
    }
}
