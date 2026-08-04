package com.panzipool.api.web.admin.service;

import com.panzipool.api.common.ApiConstants;
import com.panzipool.api.common.BusinessException;
import com.panzipool.api.web.admin.dto.AdminFeedbackDetail;
import com.panzipool.api.web.admin.dto.AdminFeedbackItem;
import com.panzipool.api.web.feedback.dao.FeedbackMessageRepository;
import com.panzipool.api.web.feedback.entity.FeedbackMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminFeedbackService {

    private static final String STATUS_VISIBLE = "visible";
    private static final String STATUS_HIDDEN = "hidden";
    private static final String STATUS_DELETED = "deleted";
    private static final List<String> ALLOWED_STATUSES = List.of(STATUS_VISIBLE, STATUS_HIDDEN, STATUS_DELETED);

    private final FeedbackMessageRepository feedbackMessageRepository;

    @Transactional(readOnly = true)
    public Page<AdminFeedbackItem> listFeedback(int page, int size, String status, String keyword) {
        Pageable pageable = PageRequest.of(page, size);
        Page<FeedbackMessage> pageResult;
        boolean hasStatus = status != null && !status.isBlank();
        boolean hasKeyword = keyword != null && !keyword.isBlank();

        if (hasStatus && hasKeyword) {
            pageResult = feedbackMessageRepository
                    .findByStatusAndContentContainingOrStatusAndNicknameContainingOrderByCreatedAtDesc(
                            status, keyword, status, keyword, pageable);
        } else if (hasStatus) {
            pageResult = feedbackMessageRepository.findByStatusOrderByCreatedAtDesc(status, pageable);
        } else if (hasKeyword) {
            pageResult = feedbackMessageRepository
                    .findByContentContainingOrNicknameContainingOrderByCreatedAtDesc(keyword, keyword, pageable);
        } else {
            pageResult = feedbackMessageRepository.findAllByOrderByCreatedAtDesc(pageable);
        }
        return pageResult.map(AdminFeedbackItem::from);
    }

    @Transactional(readOnly = true)
    public AdminFeedbackDetail getFeedbackDetail(Long id) {
        FeedbackMessage entity = feedbackMessageRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ApiConstants.CODE_NOT_FOUND, "留言不存在", HttpStatus.NOT_FOUND));
        return AdminFeedbackDetail.from(entity);
    }

    @Transactional
    public AdminFeedbackDetail replyFeedback(Long id, String replyContent, String adminUser) {
        FeedbackMessage entity = feedbackMessageRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ApiConstants.CODE_NOT_FOUND, "留言不存在", HttpStatus.NOT_FOUND));
        if (replyContent == null || replyContent.isBlank()) {
            entity.setAdminReply(null);
            entity.setReplyAt(null);
            entity.setReplyBy(null);
        } else {
            entity.setAdminReply(replyContent);
            entity.setReplyAt(LocalDateTime.now());
            entity.setReplyBy(adminUser);
        }
        FeedbackMessage saved = feedbackMessageRepository.save(entity);
        return AdminFeedbackDetail.from(saved);
    }

    @Transactional
    public AdminFeedbackDetail updateStatus(Long id, String newStatus) {
        if (!ALLOWED_STATUSES.contains(newStatus)) {
            throw new BusinessException(ApiConstants.CODE_BAD_REQUEST, "非法状态值");
        }
        FeedbackMessage entity = feedbackMessageRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ApiConstants.CODE_NOT_FOUND, "留言不存在", HttpStatus.NOT_FOUND));
        entity.setStatus(newStatus);
        FeedbackMessage saved = feedbackMessageRepository.save(entity);
        return AdminFeedbackDetail.from(saved);
    }
}
