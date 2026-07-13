package com.panzipool.api.common;

/**
 * API 响应码常量定义。
 *
 * <p>约定：成功码为 {@code 0}；HTTP 对齐错误码直接复用 HTTP 状态码；
 * 业务错误码从 {@code 1001} 起编号，避免与 HTTP 状态码冲突。</p>
 */
public final class ApiConstants {

    /** 成功 */
    public static final int CODE_SUCCESS = 0;

    // ---- HTTP 对齐错误码 ----
    /** 请求参数错误 */
    public static final int CODE_BAD_REQUEST = 400;
    /** 未认证 */
    public static final int CODE_UNAUTHORIZED = 401;
    /** 资源不存在 */
    public static final int CODE_NOT_FOUND = 404;
    /** 资源冲突（如重复点赞、唯一约束冲突） */
    public static final int CODE_CONFLICT = 409;
    /** 频率超限 */
    public static final int CODE_TOO_MANY_REQUESTS = 429;
    /** 服务器内部错误 */
    public static final int CODE_INTERNAL_ERROR = 500;

    // ---- 业务错误码（后续 Task 使用） ----
    /** 工具不存在（slug 未找到） */
    public static final int CODE_TOOL_NOT_FOUND = 1001;
    /** 非法事件类型（不在白名单） */
    public static final int CODE_EVENT_TYPE_INVALID = 1002;
    /** 已点赞（重复点赞） */
    public static final int CODE_ALREADY_LIKED = 1003;
    /** 事件上报频率超限 */
    public static final int CODE_RATE_LIMIT_EXCEEDED = 1004;

    private ApiConstants() {
        throw new UnsupportedOperationException("常量类不可实例化");
    }
}
