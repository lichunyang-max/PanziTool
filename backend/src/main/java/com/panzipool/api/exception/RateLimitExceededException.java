package com.panzipool.api.exception;

/**
 * 频率限制超限异常。
 *
 * <p>当同一 anon_id 或 IP 在时间窗口内超过配置的最大请求数时抛出。
 * 由 {@link GlobalExceptionHandler} 统一捕获并转换为 HTTP 429 响应。</p>
 */
public class RateLimitExceededException extends RuntimeException {

    public RateLimitExceededException() {
        super("请求过于频繁，请稍后再试");
    }

    public RateLimitExceededException(String message) {
        super(message);
    }
}
