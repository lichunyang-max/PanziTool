package com.panzipool.api.web.feedback.service;

import com.panzipool.api.common.ApiConstants;
import com.panzipool.api.common.BusinessException;
import com.panzipool.api.web.feedback.dao.FeedbackMessageRepository;
import com.panzipool.api.web.feedback.dto.FeedbackRequest;
import com.panzipool.api.web.feedback.dto.FeedbackResponse;
import com.panzipool.api.web.feedback.entity.FeedbackMessage;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

/**
 * 意见反馈服务。
 *
 * <p>提供留言创建与公开查询能力，内置基于 IP 的简易内存限流
 * （同一 IP 每分钟最多 3 条）。</p>
 *
 * <p><b>局限性</b>：内存限流不适用于多实例部署（不跨节点共享），
 * 生产环境建议升级为 Redis 滑动窗口限流。</p>
 */
@Service
@RequiredArgsConstructor
public class FeedbackService {

    private static final Logger log = LoggerFactory.getLogger(FeedbackService.class);

    /** 同一 IP 每分钟最大提交数 */
    private static final int MAX_PER_MINUTE = 3;
    /** 1 分钟毫秒数 */
    private static final long WINDOW_MS = 60_000L;
    /** 公开可见状态 */
    private static final String STATUS_VISIBLE = "visible";

    private final FeedbackMessageRepository feedbackMessageRepository;

    /** key = IP，value = 提交时间戳毫秒队列 */
    private final ConcurrentHashMap<String, Deque<Long>> ipTimeWindows = new ConcurrentHashMap<>();

    /**
     * 创建意见反馈留言。
     *
     * @param request 反馈请求体
     * @param ip      提交者 IP
     * @return 创建后的留言响应
     */
    @Transactional
    public FeedbackResponse createFeedback(FeedbackRequest request, String ip) {
        // 1. 基于 IP 的简易限流：同一 IP 每分钟最多 3 条
        checkRateLimit(ip);

        // 2. 构建实体并保存
        FeedbackMessage message = new FeedbackMessage();
        message.setContent(request.getContent());
        message.setNickname(request.getNickname());
        message.setContact(request.getContact());
        message.setIp(ip);
        message.setStatus(STATUS_VISIBLE);
        FeedbackMessage saved = feedbackMessageRepository.save(message);

        log.debug("意见反馈创建成功: id={}, ip={}", saved.getId(), ip);
        return FeedbackResponse.from(saved);
    }

    /**
     * 分页查询公开可见的反馈留言（按创建时间倒序）。
     */
    @Transactional(readOnly = true)
    public Page<FeedbackResponse> listPublicFeedback(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return feedbackMessageRepository
                .findByStatusOrderByCreatedAtDesc(STATUS_VISIBLE, pageable)
                .map(FeedbackResponse::from);
    }

    /**
     * 基于 IP 的固定窗口限流：同一 IP 在 1 分钟内最多提交 {@value #MAX_PER_MINUTE} 条。
     *
     * @throws BusinessException 当超过限流阈值时抛出（code=429）
     */
    private void checkRateLimit(String ip) {
        if (ip == null || ip.isBlank()) {
            return;
        }
        long now = System.currentTimeMillis();
        ipTimeWindows.compute(ip, (key, deque) -> {
            if (deque == null) {
                deque = new ConcurrentLinkedDeque<>();
            }
            // 清理超过 1 分钟的过期记录
            long threshold = now - WINDOW_MS;
            while (!deque.isEmpty() && deque.peekFirst() < threshold) {
                deque.pollFirst();
            }
            if (deque.size() >= MAX_PER_MINUTE) {
                log.warn("意见反馈限流触发: ip={}, current={}, max={}", ip, deque.size(), MAX_PER_MINUTE);
                throw new BusinessException(ApiConstants.CODE_TOO_MANY_REQUESTS,
                        "提交过于频繁，请稍后再试", HttpStatus.TOO_MANY_REQUESTS);
            }
            deque.addLast(now);
            return deque;
        });
    }
}
