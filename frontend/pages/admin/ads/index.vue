<script setup lang="ts">
/**
 * pages/admin/ads/index.vue - 广告管理
 *
 * 功能：
 * - 浏览：ad_promotion 表分页列表（图片/描述、联盟/推广位、投放位置、有效期、启用状态）
 * - 查询：关键词（商品描述/推广位名称/推广位ID/广告联盟）+ 投放位置标识 + 启用状态
 * - 新增 / 编辑：全字段表单，商品图片走 /admin/upload 上传 MinIO 自动回填 URL
 * - 删除：二次确认后物理删除
 *
 * API：
 * - GET    /api/v1/admin/ads                 分页列表（page/size/keyword/locationSymbol/enabled）
 * - GET    /api/v1/admin/ads/{id}            广告详情
 * - POST   /api/v1/admin/ads                 新增广告
 * - PUT    /api/v1/admin/ads/{id}            更新广告
 * - DELETE /api/v1/admin/ads/{id}            删除广告
 * - POST   /api/v1/admin/upload              图片上传（multipart，字段名 file）
 */
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth',
})

useHead({
  titleTemplate: null,
  title: '广告管理 | 盘子工具站',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})

// ============ 类型定义 ============

interface AdAdminItem {
  id: number
  adUnion: string
  adUnionSymbol: string
  adPlacement: string
  pid: string
  productDescription: string
  productUrl: string
  adUrl: string
  adStart: string
  adEnd: string
  adEnabled: boolean
  adLocation: string
  adLocationSymbol: string
  createdAt: string
  updatedAt: string
}

interface AdPage {
  content: AdAdminItem[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

interface ApiResponse<T> {
  code: number
  data: T
  message?: string
}

interface AdForm {
  id: number | null
  adUnion: string
  adUnionSymbol: string
  adPlacement: string
  pid: string
  productDescription: string
  productUrl: string
  adUrl: string
  adStart: string
  adEnd: string
  adEnabled: boolean
  adLocation: string
  adLocationSymbol: string
}

// 站内已有广告位标识（与前台调用 /api/v1/ads 时传的 locationSymbol 保持一致）
const LOCATION_OPTIONS = [
  { symbol: 'home_middle', name: '网站首页中部广告位' },
  { symbol: 'tool_footer', name: '工具页底部广告位' },
  { symbol: 'dev_tool_middle', name: '开发者工具中部广告位' },
  { symbol: 'img_tool_middle', name: '图片工具中部广告位' },
] as const

// ============ 基础配置 ============

const config = useRuntimeConfig()
const baseURL = import.meta.server
  ? (config.apiBase as string)
  : (config.public.apiBase as string)

async function api<T>(path: string, options: Record<string, unknown> = {}): Promise<T> {
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

/** 处理 401：客户端清登录标记并跳转登录页；SSR 抛错由 Nuxt 处理重定向 */
function handleAuthError(err: unknown): boolean {
  const error = err as { statusCode?: number; response?: { status?: number } }
  const status = error?.statusCode ?? error?.response?.status
  if (status === 401) {
    if (import.meta.server) {
      throw new Error('UNAUTHORIZED')
    }
    localStorage.removeItem('admin_logged_in')
    void navigateTo('/admin/login')
    return true
  }
  return false
}

// ============ Toast ============

const toastMessage = ref('')
const toastType = ref<'success' | 'error'>('success')
let toastTimer: ReturnType<typeof setTimeout> | null = null

function showToast(msg: string, type: 'success' | 'error' = 'success') {
  toastMessage.value = msg
  toastType.value = type
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastMessage.value = ''
  }, 3000)
}

// ============ 列表查询 ============

const page = ref(0)
const keywordInput = ref('')
const appliedKeyword = ref('')
const filterLocation = ref<string>('all')
const filterEnabled = ref<string>('all')

function emptyPage(): AdPage {
  return { content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 }
}

const cacheKey = computed(() =>
  `admin-ads-${page.value}-${appliedKeyword.value}-${filterLocation.value}-${filterEnabled.value}`,
)

const { data: pageData, refresh, pending } = await useAsyncData<AdPage>(
  cacheKey,
  async () => {
    const params = new URLSearchParams()
    params.set('page', String(page.value))
    params.set('size', '10')
    if (appliedKeyword.value) params.set('keyword', appliedKeyword.value)
    if (filterLocation.value !== 'all') params.set('locationSymbol', filterLocation.value)
    if (filterEnabled.value !== 'all') params.set('enabled', filterEnabled.value)

    // SSR 环境下手动转发 Cookie，使后端认证拦截器能识别登录状态
    const headers: Record<string, string> = {}
    if (import.meta.server) {
      const event = useRequestEvent()
      const cookie = event?.node?.req?.headers?.cookie
      if (cookie) headers.cookie = cookie
    }

    try {
      return await api<AdPage>(`/api/v1/admin/ads?${params.toString()}`, { headers })
    } catch (err) {
      if (handleAuthError(err)) return emptyPage()
      if (import.meta.client) {
        showToast(err instanceof Error ? err.message : '加载广告列表失败', 'error')
      }
      return emptyPage()
    }
  },
  { default: emptyPage },
)

watch([page, filterLocation, filterEnabled], () => {
  void refresh()
})

function handleSearch() {
  appliedKeyword.value = keywordInput.value.trim()
  page.value = 0
  void refresh()
}

function handleReset() {
  keywordInput.value = ''
  appliedKeyword.value = ''
  filterLocation.value = 'all'
  filterEnabled.value = 'all'
  page.value = 0
  void refresh()
}

function goToPage(p: number) {
  const total = pageData.value?.totalPages ?? 0
  if (p < 0 || p >= total) return
  page.value = p
  if (import.meta.client) window.scrollTo({ top: 0, behavior: 'smooth' })
}

const pageNumbers = computed<(number | string)[]>(() => {
  const total = pageData.value?.totalPages ?? 0
  const current = (pageData.value?.number ?? 0) + 1
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | string)[] = [1]
  if (current > 4) pages.push('...')
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  if (current < total - 3) pages.push('...')
  pages.push(total)
  return pages
})

// ============ 时间与状态展示 ============

function formatTime(timeStr?: string | null): string {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  if (Number.isNaN(date.getTime())) return timeStr
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** 投放时段状态：未开始 / 投放中 / 已结束 */
function periodState(item: AdAdminItem): 'upcoming' | 'active' | 'expired' {
  const now = Date.now()
  const start = new Date(item.adStart).getTime()
  const end = new Date(item.adEnd).getTime()
  if (now < start) return 'upcoming'
  if (now > end) return 'expired'
  return 'active'
}

const PERIOD_BADGE: Record<string, { text: string; color: string }> = {
  upcoming: { text: '未开始', color: '#b45309' },
  active: { text: '投放中', color: '#15803d' },
  expired: { text: '已结束', color: '#6b7280' },
}

function locationName(symbol: string): string {
  return LOCATION_OPTIONS.find((o) => o.symbol === symbol)?.name ?? symbol
}

// ============ 新增 / 编辑 ============

function emptyForm(): AdForm {
  return {
    id: null,
    adUnion: '',
    adUnionSymbol: '',
    adPlacement: '',
    pid: '',
    productDescription: '',
    productUrl: '',
    adUrl: '',
    adStart: '',
    adEnd: '',
    adEnabled: true,
    adLocation: '',
    adLocationSymbol: '',
  }
}

/** datetime-local 赋值需要截取到分钟（yyyy-MM-ddTHH:mm） */
function toDateTimeLocal(value?: string | null): string {
  return value ? value.slice(0, 16) : ''
}

const showFormModal = ref(false)
const formSaving = ref(false)
const adForm = ref<AdForm>(emptyForm())
const isEditMode = computed(() => adForm.value.id != null)

function openCreate() {
  adForm.value = emptyForm()
  // 默认投放时间：今天 00:00 ~ 一年后的 23:59
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  adForm.value.adStart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T00:00`
  const next = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
  adForm.value.adEnd = `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}T23:59`
  showFormModal.value = true
}

function openEdit(item: AdAdminItem) {
  adForm.value = {
    id: item.id,
    adUnion: item.adUnion,
    adUnionSymbol: item.adUnionSymbol,
    adPlacement: item.adPlacement,
    pid: item.pid,
    productDescription: item.productDescription,
    productUrl: item.productUrl,
    adUrl: item.adUrl,
    adStart: toDateTimeLocal(item.adStart),
    adEnd: toDateTimeLocal(item.adEnd),
    adEnabled: item.adEnabled,
    adLocation: item.adLocation,
    adLocationSymbol: item.adLocationSymbol,
  }
  showFormModal.value = true
}

function closeFormModal() {
  if (formSaving.value) return
  showFormModal.value = false
}

/** 从建议列表选择已知广告位标识时，自动带出投放位置名称 */
function onSymbolChange() {
  const matched = LOCATION_OPTIONS.find((o) => o.symbol === adForm.value.adLocationSymbol)
  if (matched) adForm.value.adLocation = matched.name
}

function validateForm(): string | null {
  const f = adForm.value
  if (!f.adUnion.trim()) return '请输入广告联盟'
  if (!f.adUnionSymbol.trim()) return '请输入联盟标识'
  if (!f.adPlacement.trim()) return '请输入推广位名称'
  if (!f.pid.trim()) return '请输入推广位ID'
  if (!f.productDescription.trim()) return '请输入商品描述'
  if (!f.productUrl.trim()) return '请上传或填写商品图片URL'
  if (!f.adUrl.trim()) return '请输入广告跳转链接'
  if (!f.adStart) return '请选择广告开始时间'
  if (!f.adEnd) return '请选择广告结束时间'
  if (new Date(f.adEnd).getTime() < new Date(f.adStart).getTime()) {
    return '广告结束时间不能早于开始时间'
  }
  if (!f.adLocation.trim()) return '请输入投放位置名称'
  if (!f.adLocationSymbol.trim()) return '请输入投放位置标识'
  return null
}

async function submitForm() {
  const error = validateForm()
  if (error) {
    showToast(error, 'error')
    return
  }
  const f = adForm.value
  const body = {
    adUnion: f.adUnion.trim(),
    adUnionSymbol: f.adUnionSymbol.trim(),
    adPlacement: f.adPlacement.trim(),
    pid: f.pid.trim(),
    productDescription: f.productDescription.trim(),
    productUrl: f.productUrl.trim(),
    adUrl: f.adUrl.trim(),
    adStart: f.adStart,
    adEnd: f.adEnd,
    adEnabled: f.adEnabled,
    adLocation: f.adLocation.trim(),
    adLocationSymbol: f.adLocationSymbol.trim(),
  }

  formSaving.value = true
  try {
    if (isEditMode.value) {
      await api(`/api/v1/admin/ads/${f.id}`, { method: 'PUT', body })
      showToast('广告已更新')
    } else {
      await api('/api/v1/admin/ads', { method: 'POST', body })
      showToast('广告创建成功')
    }
    showFormModal.value = false
    await refresh()
  } catch (err) {
    if (!handleAuthError(err)) {
      showToast(err instanceof Error ? err.message : '保存失败', 'error')
    }
  } finally {
    formSaving.value = false
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
    if (res.code !== 0) throw new Error(res.message || '上传失败')
    adForm.value.productUrl = res.data.url
    showToast('图片上传成功')
  } catch (err) {
    if (!handleAuthError(err)) {
      showToast(err instanceof Error ? err.message : '图片上传失败，请稍后重试', 'error')
    }
  } finally {
    uploading.value = false
  }
}

// ============ 删除 ============

const pendingDelete = ref<AdAdminItem | null>(null)
const deleteLoading = ref(false)

async function confirmDelete() {
  const item = pendingDelete.value
  if (!item || deleteLoading.value) return
  deleteLoading.value = true
  try {
    await api(`/api/v1/admin/ads/${item.id}`, { method: 'DELETE' })
    showToast('广告已删除')
    pendingDelete.value = null
    // 删除当前页最后一条时回退一页
    if ((pageData.value?.content.length ?? 0) <= 1 && page.value > 0) {
      page.value -= 1
    } else {
      await refresh()
    }
  } catch (err) {
    if (!handleAuthError(err)) {
      showToast(err instanceof Error ? err.message : '删除失败', 'error')
    }
  } finally {
    deleteLoading.value = false
  }
}
</script>

<template>
  <div class="p-6 max-w-[1280px] mx-auto">
    <!-- ============ 页头 ============ -->
    <div class="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1
          class="text-2xl font-semibold tracking-tight"
          style="font-family: var(--pz-font-display); color: var(--pz-color-text-primary)"
        >
          广告管理
        </h1>
        <p class="mt-1 text-sm" style="color: var(--pz-color-text-secondary)">
          管理 ad_promotion 广告投放：联盟信息、推广位、展示素材、投放位置与有效期
        </p>
      </div>
      <button type="button" class="pz-btn-primary text-sm px-4 py-2 shrink-0" @click="openCreate">
        + 新增广告
      </button>
    </div>

    <!-- ============ 查询栏 ============ -->
    <div class="pz-card p-4 mb-5">
      <div class="flex flex-col lg:flex-row gap-3 lg:items-center">
        <div class="relative flex-1">
          <svg
            class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            style="color: var(--pz-color-text-muted)"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            v-model="keywordInput"
            type="text"
            class="pz-input w-full pl-9"
            placeholder="搜索商品描述 / 推广位名称 / 推广位ID / 广告联盟"
            @keyup.enter="handleSearch"
          >
        </div>
        <select v-model="filterLocation" class="pz-input lg:w-44">
          <option value="all">全部投放位置</option>
          <option v-for="opt in LOCATION_OPTIONS" :key="opt.symbol" :value="opt.symbol">
            {{ opt.name }}
          </option>
        </select>
        <select v-model="filterEnabled" class="pz-input lg:w-32">
          <option value="all">全部状态</option>
          <option value="true">启用中</option>
          <option value="false">已停用</option>
        </select>
        <div class="flex gap-2">
          <button type="button" class="pz-btn-primary text-sm px-4 py-2" @click="handleSearch">
            查询
          </button>
          <button type="button" class="pz-btn-ghost text-sm px-4 py-2" @click="handleReset">
            重置
          </button>
        </div>
      </div>
    </div>

    <!-- ============ 列表 ============ -->
    <div class="pz-card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm" style="min-width: 960px">
          <thead style="background: var(--pz-color-bg)">
            <tr>
              <th class="px-4 py-3 text-left font-medium" style="color: var(--pz-color-text-secondary)">广告内容</th>
              <th class="px-4 py-3 text-left font-medium w-48" style="color: var(--pz-color-text-secondary)">联盟 / 推广位</th>
              <th class="px-4 py-3 text-left font-medium w-40" style="color: var(--pz-color-text-secondary)">投放位置</th>
              <th class="px-4 py-3 text-left font-medium w-52" style="color: var(--pz-color-text-secondary)">投放时间</th>
              <th class="px-4 py-3 text-left font-medium w-24" style="color: var(--pz-color-text-secondary)">状态</th>
              <th class="px-4 py-3 text-left font-medium w-28" style="color: var(--pz-color-text-secondary)">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="pending">
              <td colspan="6" class="px-4 py-12 text-center" style="color: var(--pz-color-text-muted)">
                <svg class="animate-spin inline" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--pz-color-primary)" aria-hidden="true">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                <div class="mt-2">加载中...</div>
              </td>
            </tr>
            <tr v-else-if="!pageData?.content?.length">
              <td colspan="6" class="px-4 py-12 text-center" style="color: var(--pz-color-text-muted)">
                <svg class="mx-auto mb-3 opacity-40" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                  <path d="M3 11v2a1 1 0 0 0 1 1h3l4 4V6L7 10H4a1 1 0 0 0-1 1zm13.94-4.06l-1.41 1.41a8 8 0 0 1 0 11.31l1.41 1.41a10 10 0 0 0 0-14.13zM18.36 8.64l-1.41 1.41a4 4 0 0 1 0 5.9l1.41 1.41a6 6 0 0 0 0-8.72z" />
                </svg>
                暂无广告数据，点击右上角「新增广告」创建
              </td>
            </tr>
            <tr
              v-for="item in pageData?.content"
              :key="item.id"
              class="border-t transition-colors hover:bg-muted/50"
              style="border-color: var(--pz-color-border)"
            >
              <!-- 广告内容 -->
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div class="w-14 h-14 rounded-md shrink-0 overflow-hidden flex items-center justify-center border" style="border-color: var(--pz-color-border); background: var(--pz-color-bg)">
                    <img v-if="item.productUrl" :src="item.productUrl" :alt="item.productDescription" class="w-full h-full object-cover" referrerpolicy="no-referrer" >
                    <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--pz-color-text-muted)" aria-hidden="true">
                      <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                  <div class="min-w-0">
                    <div class="font-medium truncate max-w-xs" :title="item.productDescription" style="color: var(--pz-color-text-primary)">
                      {{ item.productDescription }}
                    </div>
                    <a
                      :href="item.adUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="block text-xs truncate max-w-xs hover:underline"
                      :title="item.adUrl"
                      style="color: var(--pz-color-primary)"
                    >
                      {{ item.adUrl }}
                    </a>
                  </div>
                </div>
              </td>

              <!-- 联盟 / 推广位 -->
              <td class="px-4 py-3 align-top">
                <div class="font-medium" style="color: var(--pz-color-text-primary)">{{ item.adUnion }}</div>
                <div class="text-xs mt-0.5" style="color: var(--pz-color-text-secondary)">{{ item.adPlacement }}</div>
                <div class="text-xs mt-0.5 font-mono truncate max-w-[170px]" :title="item.pid" style="color: var(--pz-color-text-muted)">
                  {{ item.pid }}
                </div>
              </td>

              <!-- 投放位置 -->
              <td class="px-4 py-3 align-top">
                <div style="color: var(--pz-color-text-primary)">{{ item.adLocation }}</div>
                <div class="text-xs mt-0.5 font-mono" style="color: var(--pz-color-text-muted)">{{ item.adLocationSymbol }}</div>
              </td>

              <!-- 投放时间 -->
              <td class="px-4 py-3 align-top">
                <div class="text-xs whitespace-nowrap" style="color: var(--pz-color-text-secondary)">
                  {{ formatTime(item.adStart) }}
                </div>
                <div class="text-xs whitespace-nowrap" style="color: var(--pz-color-text-secondary)">
                  至 {{ formatTime(item.adEnd) }}
                </div>
                <span
                  class="inline-block mt-1 px-1.5 py-0.5 rounded text-xs"
                  :style="{ color: PERIOD_BADGE[periodState(item)].color, background: 'var(--pz-color-bg)' }"
                >
                  {{ PERIOD_BADGE[periodState(item)].text }}
                </span>
              </td>

              <!-- 状态 -->
              <td class="px-4 py-3 align-top">
                <span
                  class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                  :style="item.adEnabled
                    ? { color: '#15803d', background: 'rgba(21,128,61,0.1)' }
                    : { color: '#6b7280', background: 'var(--pz-color-bg)' }"
                >
                  <span class="w-1.5 h-1.5 rounded-full" :style="{ background: item.adEnabled ? '#15803d' : '#9ca3af' }" />
                  {{ item.adEnabled ? '启用中' : '已停用' }}
                </span>
              </td>

              <!-- 操作 -->
              <td class="px-4 py-3 align-top">
                <div class="flex items-center gap-3">
                  <button type="button" class="text-xs hover:underline" style="color: var(--pz-color-primary)" @click="openEdit(item)">
                    编辑
                  </button>
                  <button
                    type="button"
                    class="text-xs hover:underline"
                    style="color: var(--pz-state-error, #dc2626)"
                    @click="pendingDelete = item"
                  >
                    删除
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页 -->
      <div class="flex items-center justify-between px-4 py-3 border-t" style="border-color: var(--pz-color-border)">
        <span class="text-xs" style="color: var(--pz-color-text-muted)">
          共 {{ pageData?.totalElements ?? 0 }} 条广告
        </span>
        <nav v-if="pageData && pageData.totalPages > 1" class="flex items-center gap-1">
          <button
            type="button"
            class="px-2 py-1 text-sm border rounded disabled:opacity-40"
            style="border-color: var(--pz-color-border); color: var(--pz-color-text-secondary)"
            :disabled="(pageData.number ?? 0) === 0"
            @click="goToPage((pageData.number ?? 0) - 1)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <template v-for="(p, idx) in pageNumbers" :key="idx">
            <span v-if="p === '...'" class="px-1" style="color: var(--pz-color-text-muted)">...</span>
            <button
              v-else
              type="button"
              class="px-3 py-1 text-sm border rounded"
              :style="(p as number) - 1 === (pageData.number ?? 0)
                ? { background: 'var(--pz-color-primary)', color: '#fff', borderColor: 'var(--pz-color-primary)' }
                : { borderColor: 'var(--pz-color-border)', color: 'var(--pz-color-text-primary)' }"
              @click="goToPage((p as number) - 1)"
            >
              {{ p }}
            </button>
          </template>
          <button
            type="button"
            class="px-2 py-1 text-sm border rounded disabled:opacity-40"
            style="border-color: var(--pz-color-border); color: var(--pz-color-text-secondary)"
            :disabled="(pageData.number ?? 0) >= (pageData.totalPages - 1)"
            @click="goToPage((pageData.number ?? 0) + 1)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </nav>
      </div>
    </div>

    <!-- ============ 新增 / 编辑弹窗 ============ -->
    <div
      v-if="showFormModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      style="background: rgba(15, 23, 42, 0.5)"
      @click.self="closeFormModal"
    >
      <div class="pz-card w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto" style="box-shadow: var(--pz-shadow-lg, 0 10px 30px rgba(0,0,0,0.2))">
        <h3 class="text-lg font-semibold mb-5" style="color: var(--pz-color-text-primary)">
          {{ isEditMode ? '编辑广告' : '新增广告' }}
        </h3>

        <form class="space-y-4" novalidate @submit.prevent="submitForm">
          <!-- 广告联盟 / 联盟标识 -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm mb-1.5" style="color: var(--pz-color-text-primary)">广告联盟 *</label>
              <input v-model="adForm.adUnion" class="pz-input w-full" placeholder="如：淘宝联盟" maxlength="32" >
            </div>
            <div>
              <label class="block text-sm mb-1.5" style="color: var(--pz-color-text-primary)">联盟标识 *</label>
              <input v-model="adForm.adUnionSymbol" class="pz-input w-full" placeholder="如：pub.alimama.com" maxlength="128" >
            </div>
          </div>

          <!-- 推广位名称 / 推广位ID -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm mb-1.5" style="color: var(--pz-color-text-primary)">推广位名称 *</label>
              <input v-model="adForm.adPlacement" class="pz-input w-full" placeholder="如：首页中部横幅广告" maxlength="32" >
            </div>
            <div>
              <label class="block text-sm mb-1.5" style="color: var(--pz-color-text-primary)">推广位ID *</label>
              <input v-model="adForm.pid" class="pz-input w-full font-mono" placeholder="如：mm_10463602253_3429100" maxlength="64" >
            </div>
          </div>

          <!-- 投放位置名称 / 标识 -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm mb-1.5" style="color: var(--pz-color-text-primary)">投放位置名称 *</label>
              <input v-model="adForm.adLocation" class="pz-input w-full" placeholder="如：网站首页中部广告位" maxlength="32" >
            </div>
            <div>
              <label class="block text-sm mb-1.5" style="color: var(--pz-color-text-primary)">
                投放位置标识 *
                <span class="text-xs font-normal" style="color: var(--pz-color-text-muted)">（前台按此标识取广告）</span>
              </label>
              <input
                v-model="adForm.adLocationSymbol"
                list="ad-location-symbols"
                class="pz-input w-full font-mono"
                placeholder="选择或输入，如 home_middle"
                maxlength="32"
                @change="onSymbolChange"
              >
              <datalist id="ad-location-symbols">
                <option v-for="opt in LOCATION_OPTIONS" :key="opt.symbol" :value="opt.symbol">{{ opt.name }}</option>
              </datalist>
            </div>
          </div>

          <!-- 商品描述 -->
          <div>
            <label class="block text-sm mb-1.5" style="color: var(--pz-color-text-primary)">商品描述（广告展示文案）*</label>
            <input v-model="adForm.productDescription" class="pz-input w-full" placeholder="如：阿里云轻量云服务器｜到手68元起" maxlength="128" >
          </div>

          <!-- 广告跳转链接 -->
          <div>
            <label class="block text-sm mb-1.5" style="color: var(--pz-color-text-primary)">广告跳转链接 *</label>
            <input v-model="adForm.adUrl" class="pz-input w-full" placeholder="https://..." maxlength="256" >
          </div>

          <!-- 商品图片 -->
          <div>
            <label class="block text-sm mb-1.5" style="color: var(--pz-color-text-primary)">
              商品图片 *
              <span class="text-xs font-normal" style="color: var(--pz-color-text-muted)">（jpg/png/webp/gif，≤5MB，上传后自动回填 URL）</span>
            </label>
            <div class="flex items-start gap-3">
              <div class="w-24 h-24 rounded-md shrink-0 overflow-hidden flex items-center justify-center border" style="border-color: var(--pz-color-border); background: var(--pz-color-bg)">
                <img v-if="adForm.productUrl" :src="adForm.productUrl" alt="预览" class="w-full h-full object-cover" referrerpolicy="no-referrer" >
                <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--pz-color-text-muted)" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
              <div class="flex-1 min-w-0 space-y-2">
                <input v-model="adForm.productUrl" class="pz-input w-full text-xs" placeholder="图片 URL（上传后自动填充，也可手动输入）" maxlength="256" >
                <div class="flex items-center gap-3">
                  <button type="button" class="pz-btn-ghost text-xs px-3 py-1.5" :disabled="uploading" @click="triggerUpload">
                    {{ uploading ? '上传中...' : '上传图片' }}
                  </button>
                  <button v-if="adForm.productUrl" type="button" class="text-xs" style="color: var(--pz-color-text-muted)" @click="adForm.productUrl = ''">
                    清除
                  </button>
                </div>
              </div>
            </div>
            <input
              ref="fileInputRef"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/x-icon,image/bmp"
              class="hidden"
              @change="handleFileChange"
            >
          </div>

          <!-- 投放时间 -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm mb-1.5" style="color: var(--pz-color-text-primary)">开始时间 *</label>
              <input v-model="adForm.adStart" type="datetime-local" class="pz-input w-full" >
            </div>
            <div>
              <label class="block text-sm mb-1.5" style="color: var(--pz-color-text-primary)">结束时间 *</label>
              <input v-model="adForm.adEnd" type="datetime-local" class="pz-input w-full" >
            </div>
          </div>

          <!-- 启用状态 -->
          <div>
            <label class="block text-sm mb-1.5" style="color: var(--pz-color-text-primary)">启用状态</label>
            <select v-model="adForm.adEnabled" class="pz-input w-40">
              <option :value="true">启用</option>
              <option :value="false">停用</option>
            </select>
          </div>

          <!-- 操作按钮 -->
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" class="pz-btn-ghost px-4 py-2" :disabled="formSaving" @click="closeFormModal">取消</button>
            <button type="submit" class="pz-btn-primary px-5 py-2" :disabled="formSaving">
              {{ formSaving ? '保存中...' : '保存' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ============ 删除确认 ============ -->
    <div
      v-if="pendingDelete"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      style="background: rgba(15, 23, 42, 0.5)"
      @click.self="pendingDelete = null"
    >
      <div class="pz-card w-full max-w-sm p-6">
        <h3 class="text-lg font-semibold mb-2" style="color: var(--pz-color-text-primary)">确认删除</h3>
        <p class="text-sm mb-1" style="color: var(--pz-color-text-secondary)">
          确定删除广告「{{ pendingDelete.productDescription }}」吗？
        </p>
        <p class="text-xs" style="color: var(--pz-color-text-muted)">
          投放位置：{{ locationName(pendingDelete.adLocationSymbol) }}（{{ pendingDelete.adLocationSymbol }}），删除后不可恢复。
        </p>
        <div class="flex justify-end gap-2 mt-5">
          <button type="button" class="pz-btn-ghost px-4 py-2" :disabled="deleteLoading" @click="pendingDelete = null">取消</button>
          <button
            type="button"
            class="text-sm px-4 py-2 rounded-md text-white"
            style="background: #dc2626"
            :disabled="deleteLoading"
            @click="confirmDelete"
          >
            {{ deleteLoading ? '删除中...' : '确认删除' }}
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
