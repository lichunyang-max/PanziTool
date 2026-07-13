package com.panzipool.api.service;

import com.panzipool.api.common.ApiConstants;
import com.panzipool.api.common.BusinessException;
import com.panzipool.api.dto.LikeResponse;
import com.panzipool.api.entity.Tool;
import com.panzipool.api.entity.ToolLike;
import com.panzipool.api.repository.ToolLikeRepository;
import com.panzipool.api.repository.ToolRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 点赞服务。
 *
 * <p>核心职责：</p>
 * <ol>
 *   <li>根据 slug 查询工具，不存在则抛出 404 业务异常</li>
 *   <li>基于 (tool_id, anon_id) 唯一约束实现防刷：同一匿名用户对同一工具仅能点赞一次且不可取消</li>
 *   <li>点赞成功后原子递增 {@code tools.like_count} 冗余计数</li>
 *   <li>并发容错：乐观检查 + 唯一约束兜底，捕获 {@link DataIntegrityViolationException}</li>
 * </ol>
 *
 * <p>局限性：anon_id 由客户端 localStorage 生成，可被清除/伪造；MVP 防刷为基础级
 * （同设备一次），不抵御恶意伪造，后续可叠加 IP+设备指纹。</p>
 */
@Service
public class LikeService {

    private static final Logger log = LoggerFactory.getLogger(LikeService.class);

    private final ToolRepository toolRepository;
    private final ToolLikeRepository toolLikeRepository;

    public LikeService(ToolRepository toolRepository, ToolLikeRepository toolLikeRepository) {
        this.toolRepository = toolRepository;
        this.toolLikeRepository = toolLikeRepository;
    }

    /**
     * 对指定工具点赞。
     *
     * <p>响应语义由调用方（Controller）根据 {@link LikeResponse#isLiked()} 映射 HTTP 状态码：</p>
     * <ul>
     *   <li>{@code liked=true}（首次点赞）→ HTTP 200</li>
     *   <li>{@code liked=false}（重复点赞）→ HTTP 409</li>
     * </ul>
     *
     * @param slug   工具的 URL 友好标识
     * @param anonId 匿名用户 ID（UUID）
     * @return 点赞结果（包含当前 like_count 与 liked 标志）
     * @throws BusinessException 工具不存在时抛出（code=404, HTTP 404）
     */
    @Transactional
    public LikeResponse like(String slug, String anonId) {
        // 1. 查询工具，不存在则 404
        Tool tool = toolRepository.findBySlug(slug)
                .orElseThrow(() -> new BusinessException(
                        ApiConstants.CODE_NOT_FOUND,
                        "工具不存在或已下线",
                        HttpStatus.NOT_FOUND));

        Long toolId = tool.getId();
        long currentLikeCount = tool.getLikeCount();

        // 2. 乐观检查：是否已存在 (tool_id, anon_id) 记录
        if (toolLikeRepository.existsByToolIdAndAnonId(toolId, anonId)) {
            log.debug("重复点赞（乐观检查命中）: slug={}, anon_id={}", slug, anonId);
            return new LikeResponse(currentLikeCount, false);
        }

        // 3. 插入点赞记录；使用 saveAndFlush 确保唯一约束冲突在事务内立即抛出
        try {
            ToolLike like = new ToolLike();
            like.setToolId(toolId);
            like.setAnonId(anonId);
            toolLikeRepository.saveAndFlush(like);
        } catch (DataIntegrityViolationException e) {
            // 并发兜底：另一请求在同一事务提交前插入了相同 (tool_id, anon_id)
            log.debug("并发重复点赞（唯一约束冲突）: slug={}, anon_id={}", slug, anonId);
            return new LikeResponse(currentLikeCount, false);
        }

        // 4. 原子递增冗余计数 like_count + 1（避免 "读-改-写" 竞态）
        toolRepository.incrementLikeCount(toolId);

        log.info("点赞成功: slug={}, anon_id={}, like_count={}", slug, anonId, currentLikeCount + 1);
        return new LikeResponse(currentLikeCount + 1, true);
    }
}
