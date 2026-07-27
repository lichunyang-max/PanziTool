package com.panzipool.api.web.tool.dao;

import com.panzipool.api.web.tool.entity.Tool;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

/**
 * Tool 动态查询 Specification 构建器。
 *
 * <p>将 {@link ToolQueryCriteria} 转换为 JPA {@link Specification}，
 * 实现动态条件查询（非空字段才加入 WHERE 子句）。</p>
 *
 * <p>用法：{@code toolRepository.findAll(ToolSpec.of(criteria), sort)}</p>
 */
public final class ToolSpec {

    private ToolSpec() {
    }

    /**
     * 根据 QueryCriteria 构建 Specification。
     *
     * <p>自动过滤 enabled=true 的工具；若 category 非空则追加分类条件。</p>
     */
    public static Specification<Tool> of(ToolQueryCriteria criteria) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // 仅查询已启用的工具
            predicates.add(cb.isTrue(root.get("enabled")));

            // 分类筛选（非空时追加）
            if (criteria.getCategory() != null && !criteria.getCategory().isBlank()) {
                predicates.add(cb.equal(root.get("category"), criteria.getCategory().trim()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}