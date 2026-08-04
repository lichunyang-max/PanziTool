package com.panzipool.api.web.feedback.dao;

import com.panzipool.api.web.feedback.entity.FeedbackMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * 意见反馈留言 Repository（feedback_messages 表）。
 *
 * <p>{@code findById(Long)} 已由 {@link JpaRepository} 提供，无需重复声明。</p>
 */
@Repository
public interface FeedbackMessageRepository extends JpaRepository<FeedbackMessage, Long> {

    /**
     * 按状态查询留言（按创建时间倒序）。公开查询与管理后台按状态筛选均使用此方法。
     */
    Page<FeedbackMessage> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);

    /**
     * 查询全部留言（按创建时间倒序）—— 管理后台使用。
     */
    Page<FeedbackMessage> findAllByOrderByCreatedAtDesc(Pageable pageable);

    /**
     * 按内容模糊查询 OR 昵称模糊查询（按创建时间倒序分页）——管理后台关键词搜索使用。
     */
    Page<FeedbackMessage> findByContentContainingOrNicknameContainingOrderByCreatedAtDesc(String content, String nickname, Pageable pageable);

    /**
     * 按状态 + 内容模糊查询 OR 状态 + 昵称模糊查询（按创建时间倒序分页）——管理后台带状态的关键词搜索使用。
     */
    Page<FeedbackMessage> findByStatusAndContentContainingOrStatusAndNicknameContainingOrderByCreatedAtDesc(
            String statusForContent, String content, String statusForNickname, String nickname, Pageable pageable);
}
