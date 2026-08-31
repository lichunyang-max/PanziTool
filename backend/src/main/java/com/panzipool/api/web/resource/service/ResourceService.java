package com.panzipool.api.web.resource.service;

import com.panzipool.api.common.BusinessException;
import com.panzipool.api.web.resource.dao.ResourceCategoryRepository;
import com.panzipool.api.web.resource.dao.ResourceItemRepository;
import com.panzipool.api.web.resource.dto.ResourceTreeNode;
import com.panzipool.api.web.resource.entity.ResourceCategory;
import com.panzipool.api.web.resource.entity.ResourceItem;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 资源目录与条目服务。
 *
 * <p>前台提供两级目录树 + 资源的完整树查询；后台提供目录与资源的增删改。
 * 删除一级目录时级联删除其下二级目录与资源。</p>
 */
@Service
public class ResourceService {

    private static final Logger log = LoggerFactory.getLogger(ResourceService.class);

    private final ResourceCategoryRepository categoryRepository;
    private final ResourceItemRepository itemRepository;

    public ResourceService(ResourceCategoryRepository categoryRepository,
                           ResourceItemRepository itemRepository) {
        this.categoryRepository = categoryRepository;
        this.itemRepository = itemRepository;
    }

    // =========================================================================
    // 前台：树查询
    // =========================================================================

    /**
     * 查询完整资源树（一级目录 → 二级目录 + 资源）。
     */
    @Transactional(readOnly = true)
    public List<ResourceTreeNode> getTree() {
        List<ResourceCategory> categories =
                categoryRepository.findAllByOrderBySortOrderAscIdAsc();
        List<ResourceItem> items = itemRepository.findAll();

        Map<Long, List<ResourceItem>> itemsByCategory = items.stream()
                .collect(Collectors.groupingBy(ResourceItem::getCategoryId));

        Map<Long, ResourceCategory> categoryById = categories.stream()
                .collect(Collectors.toMap(ResourceCategory::getId, Function.identity()));

        // 先构建二级节点（挂在父节点下）
        Map<Long, ResourceTreeNode> nodeById = new java.util.HashMap<>();
        List<ResourceTreeNode> roots = new ArrayList<>();

        for (ResourceCategory category : categories) {
            ResourceTreeNode node = toNode(category, itemsByCategory);
            nodeById.put(category.getId(), node);
        }
        for (ResourceCategory category : categories) {
            ResourceTreeNode node = nodeById.get(category.getId());
            if (category.getParentId() == null) {
                roots.add(node);
            } else {
                ResourceTreeNode parent = nodeById.get(category.getParentId());
                if (parent != null) {
                    parent.getChildren().add(node);
                } else {
                    // 父目录缺失（脏数据）：按一级目录兜底展示
                    log.warn("目录 {} 的父目录 {} 不存在，按一级目录展示",
                            category.getId(), category.getParentId());
                    roots.add(node);
                }
            }
        }

        // 排序：一级、二级、资源均按 sortOrder 升序
        roots.sort(Comparator.comparing(ResourceTreeNode::getSortOrder,
                Comparator.nullsLast(Comparator.naturalOrder())));
        for (ResourceTreeNode root : roots) {
            root.getChildren().sort(Comparator.comparing(ResourceTreeNode::getSortOrder,
                    Comparator.nullsLast(Comparator.naturalOrder())));
            sortItems(root);
            for (ResourceTreeNode child : root.getChildren()) {
                sortItems(child);
            }
        }
        return roots;
    }

    private ResourceTreeNode toNode(ResourceCategory category,
                                    Map<Long, List<ResourceItem>> itemsByCategory) {
        ResourceTreeNode node = new ResourceTreeNode();
        node.setId(category.getId());
        node.setName(category.getName());
        node.setParentId(category.getParentId());
        node.setSortOrder(category.getSortOrder());
        List<ResourceItem> list = itemsByCategory.getOrDefault(category.getId(), List.of());
        node.setItems(list.stream().map(this::toItemVO).collect(Collectors.toList()));
        return node;
    }

    private ResourceTreeNode.ResourceItemVO toItemVO(ResourceItem item) {
        ResourceTreeNode.ResourceItemVO vo = new ResourceTreeNode.ResourceItemVO();
        vo.setId(item.getId());
        vo.setName(item.getName());
        vo.setUrl(item.getUrl());
        vo.setImage(item.getImage());
        vo.setSortOrder(item.getSortOrder());
        return vo;
    }

    private void sortItems(ResourceTreeNode node) {
        node.getItems().sort(Comparator.comparing(
                ResourceTreeNode.ResourceItemVO::getSortOrder,
                Comparator.nullsLast(Comparator.naturalOrder())));
    }

    // =========================================================================
    // 后台：目录管理
    // =========================================================================

    /**
     * 查询全部目录（平铺，管理端使用）。
     */
    @Transactional(readOnly = true)
    public List<ResourceCategory> listCategories() {
        return categoryRepository.findAllByOrderBySortOrderAscIdAsc();
    }

    /**
     * 创建目录。二级目录的父目录必须存在且自身是一级目录（层级固定两级）。
     */
    @Transactional
    public ResourceCategory createCategory(String name, Long parentId, Integer sortOrder) {
        if (parentId != null) {
            ResourceCategory parent = categoryRepository.findById(parentId)
                    .orElseThrow(() -> notFound("父目录不存在"));
            if (parent.getParentId() != null) {
                throw badRequest("仅支持两级目录，不能在二级目录下再创建子目录");
            }
        }
        ResourceCategory category = new ResourceCategory();
        category.setName(name.trim());
        category.setParentId(parentId);
        category.setSortOrder(sortOrder == null ? 0 : sortOrder);
        return categoryRepository.save(category);
    }

    /**
     * 更新目录（名称 / 排序号）。
     */
    @Transactional
    public ResourceCategory updateCategory(Long id, String name, Integer sortOrder) {
        ResourceCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> notFound("目录不存在"));
        if (name != null && !name.isBlank()) {
            category.setName(name.trim());
        }
        if (sortOrder != null) {
            category.setSortOrder(sortOrder);
        }
        return categoryRepository.save(category);
    }

    /**
     * 删除目录。一级目录会级联删除其下二级目录与资源。
     */
    @Transactional
    public void deleteCategory(Long id) {
        ResourceCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> notFound("目录不存在"));
        if (category.getParentId() == null) {
            // 一级目录：级联删除子目录与其资源
            List<ResourceCategory> children =
                    categoryRepository.findByParentIdOrderBySortOrderAscIdAsc(id);
            for (ResourceCategory child : children) {
                itemRepository.deleteByCategoryId(child.getId());
                categoryRepository.delete(child);
            }
        }
        itemRepository.deleteByCategoryId(id);
        categoryRepository.delete(category);
        log.info("目录已删除: id={}, name={}", id, category.getName());
    }

    // =========================================================================
    // 后台：资源管理
    // =========================================================================

    /**
     * 查询某目录下的资源列表（管理端）。
     */
    @Transactional(readOnly = true)
    public List<ResourceItem> listItems(Long categoryId) {
        return itemRepository.findByCategoryIdOrderBySortOrderAscIdAsc(categoryId);
    }

    /**
     * 创建资源。所属目录必须存在。
     */
    @Transactional
    public ResourceItem createItem(Long categoryId, String name, String url,
                                   String image, Integer sortOrder) {
        ResourceCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> notFound("所属目录不存在"));
        ResourceItem item = new ResourceItem();
        item.setCategoryId(category.getId());
        item.setName(name.trim());
        item.setUrl(url.trim());
        item.setImage(image == null || image.isBlank() ? null : image.trim());
        item.setSortOrder(sortOrder == null ? 0 : sortOrder);
        return itemRepository.save(item);
    }

    /**
     * 更新资源（名称 / 链接 / 图片 / 排序号）。
     */
    @Transactional
    public ResourceItem updateItem(Long id, Long categoryId, String name, String url,
                                   String image, Integer sortOrder) {
        ResourceItem item = itemRepository.findById(id)
                .orElseThrow(() -> notFound("资源不存在"));
        if (categoryId != null) {
            ResourceCategory category = categoryRepository.findById(categoryId)
                    .orElseThrow(() -> notFound("所属目录不存在"));
            item.setCategoryId(category.getId());
        }
        if (name != null && !name.isBlank()) {
            item.setName(name.trim());
        }
        if (url != null && !url.isBlank()) {
            item.setUrl(url.trim());
        }
        if (image != null) {
            item.setImage(image.isBlank() ? null : image.trim());
        }
        if (sortOrder != null) {
            item.setSortOrder(sortOrder);
        }
        return itemRepository.save(item);
    }

    /**
     * 删除资源。
     */
    @Transactional
    public void deleteItem(Long id) {
        if (!itemRepository.existsById(id)) {
            throw notFound("资源不存在");
        }
        itemRepository.deleteById(id);
    }

    // =========================================================================
    // 异常辅助
    // =========================================================================

    private BusinessException notFound(String message) {
        return new BusinessException(404, message, HttpStatus.NOT_FOUND);
    }

    private BusinessException badRequest(String message) {
        return new BusinessException(400, message, HttpStatus.BAD_REQUEST);
    }
}
