<script setup lang="ts">
/**
 * pages/admin/resources/index.vue - 资源站管理
 *
 * 功能：
 * - 目录管理：添加一级/二级目录、重命名、删除（一级目录级联删除子目录与资源）
 * - 资源管理：按目录管理资源（名称 / 链接 / 图片 / 排序号），新建 / 编辑 / 删除
 * - 图片上传：multipart 上传至后端 /admin/upload，由后端转存 MinIO 并返回公开 URL
 *
 * API：
 * - GET    /api/v1/resources/tree                        资源树（含资源）
 * - GET    /api/v1/admin/resources/categories            目录平铺列表
 * - POST   /api/v1/admin/resources/categories            创建目录
 * - PUT    /api/v1/admin/resources/categories/{id}       更新目录
 * - DELETE /api/v1/admin/resources/categories/{id}       删除目录
 * - GET    /api/v1/admin/resources/items?categoryId=     目录下资源列表
 * - POST   /api/v1/admin/resources/items                 创建资源
 * - PUT    /api/v1/admin/resources/items/{id}            更新资源
 * - DELETE /api/v1/admin/resources/items/{id}            删除资源
 * - POST   /api/v1/admin/upload                          图片上传（multipart，字段名 file）
 */
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth',
})

useHead({
  titleTemplate: null,
  title: '资源管理 | 盘子工具站',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})

// ============ 类型定义 ============

interface ResourceItemVO {
  id: number
  name: string
  url: string
  image: string | null
  sortOrder: number
}

interface CategoryNode {
  id: number
  name: string
  parentId: number | null
  sortOrder: number
  children: CategoryNode[]
  items: ResourceItemVO[]
}

interface ResourceItemAdmin {
  id: number
  categoryId: number
  name: string
  url: string
  image: string | null
  description: string | null
  downloadCount: number
  likeCount: number
  sortOrder: number
  createdAt: string
  updatedAt: string
}

interface ApiResponse<T> {
  code: number
  data: T
  message?: string
}

// ============ 基础请求封装 ============

const config = useRuntimeConfig()
const baseURL = import.meta.server
  ? (config.apiBase as string)
  : (config.public.apiBase as string)

async function api<T>(
  path: string,
  options: Record<string, unknown> = {},
): Promise<T> {
  const res = await $fetch<ApiResponse<T>>(path, {
    baseURL,
    credentials: 'include',
    ...options,
  })
  if (res.code !== 0) {
    throw new Error(res.message || '请求失败')
  }
  return res.data
}

// ============ Toast 提示 ============

const toastMessage = ref('')
const toastType = ref<'success' | 'error'>('success')

function showToast(msg: string, type: 'success' | 'error' = 'success') {
  toastMessage.value = msg
  toastType.value = type
  setTimeout(() => {
    toastMessage.value = ''
  }, 3000)
}

// ============ 目录树状态 ============

const tree = ref<CategoryNode[]>([])
const treeLoading = ref(true)
const expanded = ref<Set<number>>(new Set())

async function loadTree() {
  treeLoading.value = true
  try {
    tree.value = await api<CategoryNode[]>('/api/v1/resources/tree')
    // 默认展开所有一级目录
    expanded.value = new Set(tree.value.map((n) => n.id))
  } catch (err) {
    showToast(err instanceof Error ? err.message : '加载目录失败', 'error')
  } finally {
    treeLoading.value = false
  }
}

function toggleExpand(id: number) {
  const set = new Set(expanded.value)
  if (set.has(id)) {
    set.delete(id)
  } else {
    set.add(id)
  }
  expanded.value = set
}

// ============ 添加目录 ============

/** null = 关闭；'root' = 添加一级目录；数字 = 在该一级目录下添加二级目录 */
const addingParent = ref<number | 'root' | null>(null)
const newCategoryName = ref('')
const addCategoryLoading = ref(false)

function startAddCategory(parentId: number | 'root') {
  addingParent.value = parentId
  newCategoryName.value = ''
}

function cancelAddCategory() {
  addingParent.value = null
  newCategoryName.value = ''
}

async function submitAddCategory() {
  const name = newCategoryName.value.trim()
  if (!name) {
    showToast('请输入目录名称', 'error')
    return
  }
  const parentId = addingParent.value === 'root' ? null : addingParent.value
  addCategoryLoading.value = true
  try {
    await api('/api/v1/admin/resources/categories', {
      method: 'POST',
      body: { name, parentId },
    })
    showToast('目录创建成功')
    cancelAddCategory()
    await loadTree()
  } catch (err) {
    showToast(err instanceof Error ? err.message : '创建失败', 'error')
  } finally {
    addCategoryLoading.value = false
  }
}

// ============ 重命名目录 ============

const renamingId = ref<number | null>(null)
const renameValue = ref('')
const renameLoading = ref(false)

function startRename(node: { id: number; name: string }) {
  renamingId.value = node.id
  renameValue.value = node.name
}

function cancelRename() {
  renamingId.value = null
  renameValue.value = ''
}

async function submitRename() {
  if (renamingId.value == null) return
  const name = renameValue.value.trim()
  if (!name) {
    showToast('目录名称不能为空', 'error')
    return
  }
  renameLoading.value = true
  try {
    await api(`/api/v1/admin/resources/categories/${renamingId.value}`, {
      method: 'PUT',
      body: { name },
    })
    showToast('目录已更新')
    cancelRename()
    await loadTree()
    // 同步刷新右侧资源区（目录名变化）
  } catch (err) {
    showToast(err instanceof Error ? err.message : '更新失败', 'error')
  } finally {
    renameLoading.value = false
  }
}

// ============ 删除目录 ============

const pendingDeleteCategory = ref<CategoryNode | null>(null)
const deleteCategoryLoading = ref(false)

const pendingDeleteCategoryCount = computed(() => {
  const node = pendingDeleteCategory.value
  if (!node) return 0
  return node.parentId === null ? node.children.length : 0
})

const pendingDeleteCategoryItemCount = computed(() => {
  const node = pendingDeleteCategory.value
  if (!node) return 0
  if (node.parentId === null) {
    return node.items.length + node.children.reduce((n, c) => n + c.items.length, 0)
  }
  return node.items.length
})

async function confirmDeleteCategory() {
  const node = pendingDeleteCategory.value
  if (!node) return
  deleteCategoryLoading.value = true
  try {
    await api(`/api/v1/admin/resources/categories/${node.id}`, { method: 'DELETE' })
    showToast('目录已删除')
    if (selectedCategoryId.value === node.id) {
      selectedCategoryId.value = null
    }
    pendingDeleteCategory.value = null
    await loadTree()
  } catch (err) {
    showToast(err instanceof Error ? err.message : '删除失败', 'error')
  } finally {
    deleteCategoryLoading.value = false
  }
}

// ============ 资源列表 ============

const selectedCategoryId = ref<number | null>(null)
const selectedCategoryName = ref('')
const items = ref<ResourceItemAdmin[]>([])
const itemsLoading = ref(false)

const selectedNode = computed(() => {
  if (selectedCategoryId.value == null) return null
  for (const root of tree.value) {
    if (root.id === selectedCategoryId.value) return root
    for (const child of root.children) {
      if (child.id === selectedCategoryId.value) return child
    }
  }
  return null
})

function selectCategory(node: { id: number; name: string }) {
  selectedCategoryId.value = node.id
  selectedCategoryName.value = node.name
  void loadItems()
}

async function loadItems() {
  if (selectedCategoryId.value == null) return
  itemsLoading.value = true
  try {
    items.value = await api<ResourceItemAdmin[]>(
      `/api/v1/admin/resources/items?categoryId=${selectedCategoryId.value}`,
    )
  } catch (err) {
    showToast(err instanceof Error ? err.message : '加载资源失败', 'error')
  } finally {
    itemsLoading.value = false
  }
}

// ============ 资源编辑（新建 / 编辑） ============

interface ItemForm {
  id: number | null
  name: string
  url: string
  image: string
  description: string
  sortOrder: number
}

const showItemModal = ref(false)
const itemForm = ref<ItemForm>({ id: null, name: '', url: '', image: '', description: '', sortOrder: 0 })
const itemSaving = ref(false)
const isEditMode = computed(() => itemForm.value.id != null)

function openCreateItem() {
  if (selectedCategoryId.value == null) {
    showToast('请先在左侧选择一个目录', 'error')
    return
  }
  itemForm.value = { id: null, name: '', url: '', image: '', description: '', sortOrder: 0 }
  showItemModal.value = true
}

function openEditItem(item: ResourceItemAdmin) {
  itemForm.value = {
    id: item.id,
    name: item.name,
    url: item.url,
    image: item.image ?? '',
    description: item.description ?? '',
    sortOrder: item.sortOrder,
  }
  showItemModal.value = true
}

function closeItemModal() {
  showItemModal.value = false
}

async function submitItem() {
  const form = itemForm.value
  if (!form.name.trim()) {
    showToast('请输入资源名称', 'error')
    return
  }
  if (!form.url.trim()) {
    showToast('请输入资源链接', 'error')
    return
  }
  itemSaving.value = true
  try {
    const body = {
      categoryId: selectedCategoryId.value,
      name: form.name.trim(),
      url: form.url.trim(),
      image: form.image.trim() || null,
      description: form.description.trim() || null,
      sortOrder: form.sortOrder,
    }
    if (isEditMode.value) {
      await api(`/api/v1/admin/resources/items/${form.id}`, {
        method: 'PUT',
        body,
      })
      showToast('资源已更新')
    } else {
      await api('/api/v1/admin/resources/items', { method: 'POST', body })
      showToast('资源创建成功')
    }
    closeItemModal()
    await Promise.all([loadItems(), loadTree()])
  } catch (err) {
    showToast(err instanceof Error ? err.message : '保存失败', 'error')
  } finally {
    itemSaving.value = false
  }
}

// ============ 删除资源 ============

const pendingDeleteItem = ref<ResourceItemAdmin | null>(null)
const deleteItemLoading = ref(false)

async function confirmDeleteItem() {
  const item = pendingDeleteItem.value
  if (!item) return
  deleteItemLoading.value = true
  try {
    await api(`/api/v1/admin/resources/items/${item.id}`, { method: 'DELETE' })
    showToast('资源已删除')
    pendingDeleteItem.value = null
    await Promise.all([loadItems(), loadTree()])
  } catch (err) {
    showToast(err instanceof Error ? err.message : '删除失败', 'error')
  } finally {
    deleteItemLoading.value = false
  }
}

// ============ 图片上传 ============

const fileInputRef = ref<HTMLInputElement | null>(null)
const uploading = ref(false)

function triggerUpload() {
  fileInputRef.value?.click()
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  // 重置 input，允许重复选择同一文件
  input.value = ''
  if (!file) return

  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    const res = await $fetch<ApiResponse<{ url: string }>>('/api/v1/admin/upload', {
      baseURL,
      method: 'POST',
      body: formData,
      credentials: 'include',
    })
    if (res.code !== 0) {
      throw new Error(res.message || '上传失败')
    }
    itemForm.value.image = res.data.url
    showToast('图片上传成功')
  } catch (err) {
    const message =
      err instanceof Error ? err.message : '图片上传失败，请检查 MinIO 服务'
    showToast(message, 'error')
  } finally {
    uploading.value = false
  }
}

// ============ 初始化 ============

onMounted(() => {
  void loadTree()
})
</script>

<template>
  <div class="p-6 max-w-[1200px] mx-auto">
    <!-- ============ 页头 ============ -->
    <div class="mb-6">
      <h1
        class="text-2xl font-semibold tracking-tight"
        style="font-family: var(--pz-font-display); color: var(--pz-color-text-primary)"
      >
        资源管理
      </h1>
      <p
        class="mt-1"
        style="font-size: var(--pz-text-sm); color: var(--pz-color-text-secondary)"
      >
        配置资源站的目录结构与资源条目（名称 / 链接 / 图标），图片将上传至 MinIO 存储
      </p>
    </div>

    <div class="flex flex-col lg:flex-row gap-5 items-start">
      <!-- ============ 左栏：目录管理 ============ -->
      <div class="pz-card w-full lg:w-[300px] shrink-0 p-4">
        <div class="flex items-center justify-between mb-3">
          <span class="font-semibold" style="color: var(--pz-color-text-primary)">
            目录结构
          </span>
          <button
            type="button"
            class="pz-btn-primary text-xs px-3 py-1.5"
            @click="startAddCategory('root')"
          >
            + 一级目录
          </button>
        </div>

        <!-- 添加一级目录输入框 -->
        <div v-if="addingParent === 'root'" class="mb-3 p-2 rounded-md" style="background: var(--pz-color-bg)">
          <input v-model="newCategoryName" class="pz-input w-full mb-2" placeholder="一级目录名称" @keyup.enter="submitAddCategory" />
          <div class="flex gap-2">
            <button type="button" class="pz-btn-primary text-xs px-3 py-1 flex-1" :disabled="addCategoryLoading" @click="submitAddCategory">
              确定
            </button>
            <button type="button" class="pz-btn-ghost text-xs px-3 py-1" @click="cancelAddCategory">
              取消
            </button>
          </div>
        </div>

        <!-- 加载中 -->
        <div v-if="treeLoading" class="py-10 flex justify-center">
          <svg class="animate-spin" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--pz-color-primary)">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        </div>

        <!-- 目录树 -->
        <div v-else class="flex flex-col gap-1">
          <div v-if="tree.length === 0" class="text-sm py-4 text-center" style="color: var(--pz-color-text-muted)">
            暂无目录，点击右上角创建
          </div>

          <div v-for="root in tree" :key="root.id">
            <!-- 一级目录 -->
            <div
              class="flex items-center gap-1 px-2 py-2 rounded-md transition-colors"
              :class="selectedCategoryId === root.id ? 'bg-primary/10' : 'hover:bg-muted'"
            >
              <!-- 展开/收起箭头 -->
              <button
                v-if="root.children.length > 0"
                type="button"
                class="shrink-0 p-0.5 rounded"
                style="color: var(--pz-color-text-secondary)"
                @click="toggleExpand(root.id)"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :style="{ transform: expanded.has(root.id) ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              <span v-else class="w-[19px]" />

              <!-- 目录名（点击选中 / 重命名态显示输入框） -->
              <template v-if="renamingId === root.id">
                <input v-model="renameValue" class="pz-input flex-1 text-sm py-1" @keyup.enter="submitRename" />
                <button type="button" class="pz-btn-primary text-xs px-2 py-1" :disabled="renameLoading" @click="submitRename">存</button>
                <button type="button" class="pz-btn-ghost text-xs px-2 py-1" @click="cancelRename">否</button>
              </template>
              <button v-else type="button" class="flex-1 text-left text-sm font-medium truncate" style="color: var(--pz-color-text-primary)" @click="selectCategory(root)">
                {{ root.name }}
              </button>

              <!-- 操作按钮 -->
              <template v-if="renamingId !== root.id">
                <button type="button" title="添加二级目录" class="p-1 rounded opacity-50 hover:opacity-100" style="color: var(--pz-color-text-secondary)" @click="startAddCategory(root.id); expanded = new Set([...expanded, root.id])">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                </button>
                <button type="button" title="重命名" class="p-1 rounded opacity-50 hover:opacity-100" style="color: var(--pz-color-text-secondary)" @click="startRename(root)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
                </button>
                <button type="button" title="删除" class="p-1 rounded opacity-50 hover:opacity-100" style="color: #dc2626" @click="pendingDeleteCategory = root">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                </button>
              </template>
            </div>

            <!-- 添加二级目录输入框 -->
            <div v-if="addingParent === root.id" class="ml-6 my-1 p-2 rounded-md" style="background: var(--pz-color-bg)">
              <input v-model="newCategoryName" class="pz-input w-full mb-2 text-sm" placeholder="二级目录名称（如 word / excel）" @keyup.enter="submitAddCategory" />
              <div class="flex gap-2">
                <button type="button" class="pz-btn-primary text-xs px-3 py-1 flex-1" :disabled="addCategoryLoading" @click="submitAddCategory">确定</button>
                <button type="button" class="pz-btn-ghost text-xs px-3 py-1" @click="cancelAddCategory">取消</button>
              </div>
            </div>

            <!-- 二级目录列表 -->
            <div v-if="root.children.length > 0 && expanded.has(root.id)" class="ml-6 flex flex-col gap-0.5">
              <div
                v-for="child in root.children"
                :key="child.id"
                class="flex items-center gap-1 px-2 py-1.5 rounded-md transition-colors"
                :class="selectedCategoryId === child.id ? 'bg-primary/10' : 'hover:bg-muted'"
              >
                <template v-if="renamingId === child.id">
                  <input v-model="renameValue" class="pz-input flex-1 text-sm py-1" @keyup.enter="submitRename" />
                  <button type="button" class="pz-btn-primary text-xs px-2 py-1" :disabled="renameLoading" @click="submitRename">存</button>
                  <button type="button" class="pz-btn-ghost text-xs px-2 py-1" @click="cancelRename">否</button>
                </template>
                <template v-else>
                  <span class="w-1.5 h-1.5 rounded-full shrink-0" style="background: var(--pz-color-text-muted)" />
                  <button type="button" class="flex-1 text-left text-sm truncate" style="color: var(--pz-color-text-secondary)" @click="selectCategory(child)">
                    {{ child.name }}
                  </button>
                  <button type="button" title="重命名" class="p-1 rounded opacity-50 hover:opacity-100" style="color: var(--pz-color-text-secondary)" @click="startRename(child)">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
                  </button>
                  <button type="button" title="删除" class="p-1 rounded opacity-50 hover:opacity-100" style="color: #dc2626" @click="pendingDeleteCategory = child">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                  </button>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ============ 右栏：资源管理 ============ -->
      <div class="pz-card w-full flex-1 p-4 min-w-0">
        <!-- 未选择目录 -->
        <div v-if="!selectedNode" class="py-16 text-center">
          <svg class="mx-auto mb-3 opacity-40" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--pz-color-text-secondary)"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
          <p class="text-sm" style="color: var(--pz-color-text-muted)">
            请在左侧选择一个目录，管理其下的资源
          </p>
        </div>

        <!-- 已选择目录 -->
        <template v-else>
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="font-semibold" style="color: var(--pz-color-text-primary)">
                {{ selectedNode.name }}
                <span class="text-xs font-normal ml-1" style="color: var(--pz-color-text-muted)">
                  {{ selectedNode.parentId === null ? '一级目录' : '二级目录' }}
                </span>
              </h2>
            </div>
            <button type="button" class="pz-btn-primary text-sm px-4 py-2" @click="openCreateItem">
              + 新建资源
            </button>
          </div>

          <!-- 加载中 -->
          <div v-if="itemsLoading" class="py-10 flex justify-center">
            <svg class="animate-spin" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--pz-color-primary)">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          </div>

          <!-- 空列表 -->
          <div v-else-if="items.length === 0" class="py-12 text-center text-sm" style="color: var(--pz-color-text-muted)">
            该目录下暂无资源，点击"新建资源"添加
          </div>

          <!-- 资源列表 -->
          <div v-else class="flex flex-col gap-2">
            <div
              v-for="item in items"
              :key="item.id"
              class="flex items-center gap-3 p-3 rounded-md border transition-colors"
              style="border-color: var(--pz-color-border)"
            >
              <!-- 图标预览 -->
              <div class="w-11 h-11 rounded-lg shrink-0 overflow-hidden flex items-center justify-center" style="background: var(--pz-color-primary-light, #dbeafe)">
                <img v-if="item.image" :src="item.image" :alt="item.name" class="w-full h-full object-cover" />
                <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--pz-color-primary)"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
              </div>

              <!-- 信息 -->
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium truncate" style="color: var(--pz-color-text-primary)">
                  {{ item.name }}
                  <span class="text-xs font-normal ml-2" style="color: var(--pz-color-text-muted)">排序 {{ item.sortOrder }}</span>
                </div>
                <div class="text-xs truncate" style="color: var(--pz-color-text-muted)">{{ item.url }}</div>
                <div class="flex items-center gap-3 mt-1 text-xs" style="color: var(--pz-color-text-muted)">
                  <span title="下载次数">↓ {{ item.downloadCount ?? 0 }}</span>
                  <span title="点赞次数">♥ {{ item.likeCount ?? 0 }}</span>
                </div>
              </div>

              <!-- 操作 -->
              <button type="button" class="pz-btn-ghost text-xs px-3 py-1.5" @click="openEditItem(item)">编辑</button>
              <button type="button" class="text-xs px-3 py-1.5 rounded-md border transition-colors" style="border-color: #fca5a5; color: #dc2626" @click="pendingDeleteItem = item">删除</button>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- ============ 资源编辑模态框 ============ -->
    <div v-if="showItemModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(15, 23, 42, 0.5)" @click.self="closeItemModal">
      <div class="pz-card w-full max-w-md p-6" style="box-shadow: var(--pz-shadow-lg, 0 10px 30px rgba(0,0,0,0.2))">
        <h3 class="text-lg font-semibold mb-4" style="color: var(--pz-color-text-primary)">
          {{ isEditMode ? '编辑资源' : '新建资源' }}
        </h3>

        <form class="space-y-4" novalidate @submit.prevent="submitItem">
          <!-- 名称 -->
          <div>
            <label class="block text-sm mb-1.5" style="color: var(--pz-color-text-primary)">资源名称 *</label>
            <input v-model="itemForm.name" class="pz-input w-full" placeholder="如：简历模板" maxlength="200" />
          </div>

          <!-- 链接 -->
          <div>
            <label class="block text-sm mb-1.5" style="color: var(--pz-color-text-primary)">跳转链接 *</label>
            <input v-model="itemForm.url" class="pz-input w-full" placeholder="https://..." maxlength="500" />
          </div>

          <!-- 描述 -->
          <div>
            <label class="block text-sm mb-1.5" style="color: var(--pz-color-text-primary)">
              资源描述
              <span class="text-xs font-normal" style="color: var(--pz-color-text-muted)">（悬停卡片与详情页展示，可空）</span>
            </label>
            <textarea v-model="itemForm.description" class="pz-input w-full" rows="3" placeholder="如：精选 20 套简历模板，涵盖各行业" maxlength="500" style="resize: vertical" />
          </div>

          <!-- 图片 -->
          <div>
            <label class="block text-sm mb-1.5" style="color: var(--pz-color-text-primary)">
              图标图片
              <span class="text-xs font-normal" style="color: var(--pz-color-text-muted)">（留空使用默认图标；jpg/png/webp/svg，≤5MB）</span>
            </label>
            <div class="flex items-start gap-3">
              <!-- 预览 -->
              <div class="w-16 h-16 rounded-lg shrink-0 overflow-hidden flex items-center justify-center border" style="border-color: var(--pz-color-border); background: var(--pz-color-bg)">
                <img v-if="itemForm.image" :src="itemForm.image" alt="预览" class="w-full h-full object-cover" />
                <svg v-else width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--pz-color-text-muted)"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
              </div>
              <div class="flex-1 min-w-0 space-y-2">
                <input v-model="itemForm.image" class="pz-input w-full text-xs" placeholder="图片 URL（上传后自动填充，也可手动输入）" maxlength="500" />
                <div class="flex items-center gap-2">
                  <button type="button" class="pz-btn-ghost text-xs px-3 py-1.5" :disabled="uploading" @click="triggerUpload">
                    <span v-if="uploading">上传中...</span>
                    <span v-else>上传图片</span>
                  </button>
                  <button v-if="itemForm.image" type="button" class="text-xs px-2 py-1" style="color: var(--pz-color-text-muted)" @click="itemForm.image = ''">
                    清除
                  </button>
                </div>
              </div>
            </div>
            <input ref="fileInputRef" type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/x-icon,image/bmp" class="hidden" @change="handleFileChange" />
          </div>

          <!-- 排序 -->
          <div>
            <label class="block text-sm mb-1.5" style="color: var(--pz-color-text-primary)">排序号</label>
            <input v-model.number="itemForm.sortOrder" type="number" class="pz-input w-full" placeholder="0（越小越靠前）" />
          </div>

          <!-- 操作按钮 -->
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" class="pz-btn-ghost px-4 py-2" @click="closeItemModal">取消</button>
            <button type="submit" class="pz-btn-primary px-4 py-2" :disabled="itemSaving">
              {{ itemSaving ? '保存中...' : '保存' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ============ 删除确认模态框 ============ -->
    <div v-if="pendingDeleteCategory || pendingDeleteItem" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(15, 23, 42, 0.5)" @click.self="pendingDeleteCategory = null; pendingDeleteItem = null">
      <div class="pz-card w-full max-w-sm p-6">
        <h3 class="text-lg font-semibold mb-2" style="color: var(--pz-color-text-primary)">确认删除</h3>

        <!-- 目录删除确认 -->
        <p v-if="pendingDeleteCategory" class="text-sm mb-1" style="color: var(--pz-color-text-secondary)">
          确定删除目录「{{ pendingDeleteCategory.name }}」吗？
        </p>
        <p v-if="pendingDeleteCategory && pendingDeleteCategory.parentId === null && pendingDeleteCategoryCount > 0" class="text-xs mb-1" style="color: #dc2626">
          该目录包含 {{ pendingDeleteCategoryCount }} 个二级子目录，将一并删除。
        </p>
        <p v-if="pendingDeleteCategory && pendingDeleteCategoryItemCount > 0" class="text-xs mb-1" style="color: #dc2626">
          将同时删除其下 {{ pendingDeleteCategoryItemCount }} 个资源，此操作不可恢复。
        </p>

        <!-- 资源删除确认 -->
        <p v-if="pendingDeleteItem" class="text-sm mb-1" style="color: var(--pz-color-text-secondary)">
          确定删除资源「{{ pendingDeleteItem.name }}」吗？此操作不可恢复。
        </p>

        <div class="flex justify-end gap-2 mt-5">
          <button type="button" class="pz-btn-ghost px-4 py-2" @click="pendingDeleteCategory = null; pendingDeleteItem = null">取消</button>
          <button type="button" class="text-sm px-4 py-2 rounded-md text-white" style="background: #dc2626" :disabled="deleteCategoryLoading || deleteItemLoading" @click="pendingDeleteCategory ? confirmDeleteCategory() : confirmDeleteItem()">
            删除
          </button>
        </div>
      </div>
    </div>

    <!-- ============ Toast ============ -->
    <Transition name="fade">
      <div
        v-if="toastMessage"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-lg text-sm text-white shadow-lg"
        :style="{ background: toastType === 'success' ? '#16a34a' : '#dc2626' }"
      >
        {{ toastMessage }}
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
