<script setup lang="ts">
/**
 * AppSidebar - 可折叠侧边栏（宽度 240px，折叠后 36px）
 * 严格参照 UI 参考文件 ui/pages/首页.html 的 sidebar 结构
 * - 两个 accordion 分组：开发者工具（默认展开）、图片工具（默认折叠）
 * - 单展开行为：点击一个分组展开，其余折叠
 * - 折叠/展开切换按钮（absolute 定位在侧边栏右边缘）
 */
const route = useRoute()

interface SidebarLink {
  label: string
  to: string
  isNew?: boolean
}

const devToolsLinks: SidebarLink[] = [
  { label: 'JSON格式化', to: '/tools/json-formatter' },
  { label: 'Cron表达式', to: '/tools/cron', isNew: true },
  { label: '二维码生成器', to: '/tools/qr-code', isNew: true },
  { label: '正则测试', to: '/tools/regex-tester' },
  { label: '时间戳转换', to: '/tools/timestamp' },
  { label: 'URL编码解码', to: '/tools/url-encode' },
  { label: 'JWT解析', to: '/tools/jwt-decoder' },
  { label: 'Base64编码', to: '/tools/base64' },
  { label: '哈希计算', to: '/tools/hash' },
]

const imageToolsLinks: SidebarLink[] = [
  { label: '图片压缩', to: '/tools/image-compress' },
  { label: '图片裁剪', to: '/tools/image-crop' },
  { label: '格式转换', to: '/tools/image-convert' },
  { label: 'AI证件照', to: '/tools/id-photo', isNew: true },
]

// 侧边栏折叠状态
const collapsed = ref(false)

// 当前展开的分组（单展开 accordion）
const expandedSection = ref<string>('dev-tools')

function toggleSidebar() {
  collapsed.value = !collapsed.value
}

function toggleSection(sectionId: string) {
  // 单展开行为：已展开则折叠，未展开则展开并折叠其余
  expandedSection.value = expandedSection.value === sectionId ? '' : sectionId
}

function isLinkActive(to: string): boolean {
  return route.path === to
}

function onToggleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    toggleSidebar()
  }
}

function onSectionKeydown(e: KeyboardEvent, sectionId: string) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    toggleSection(sectionId)
  }
}
</script>

<template>
  <div class="pz-sidebar-wrapper" :data-collapsed="collapsed">
    <!-- 折叠/展开切换按钮 -->
    <div
      class="pz-sidebar-toggle"
      role="button"
      tabindex="0"
      aria-label="折叠/展开侧边栏"
      @click="toggleSidebar"
      @keydown="onToggleKeydown"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </div>

    <aside class="pz-sidebar" aria-label="工具导航">
      <!-- 开发者工具分组 -->
      <div
        class="pz-sidebar-section"
        :data-expanded="expandedSection === 'dev-tools'"
        data-section-id="dev-tools"
      >
        <div
          class="pz-sidebar-title"
          role="button"
          tabindex="0"
          :aria-expanded="expandedSection === 'dev-tools' ? 'true' : 'false'"
          aria-controls="dev-tools-children"
          @click="toggleSection('dev-tools')"
          @keydown="onSectionKeydown($event, 'dev-tools')"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            style="color: var(--pz-color-primary)"
            aria-hidden="true"
          >
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
          <span>开发者工具</span>
          <svg
            class="pz-chevron"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            style="color: var(--pz-color-text-tertiary)"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
        <div id="dev-tools-children" class="pz-sidebar-children">
          <div class="flex flex-col gap-0.5 mt-1">
            <NuxtLink
              v-for="link in devToolsLinks"
              :key="link.to"
              :to="link.to"
              class="pz-sidebar-link"
              :data-active="isLinkActive(link.to)"
              :aria-current="isLinkActive(link.to) ? 'page' : undefined"
            >
              {{ link.label }}
              <span
                v-if="link.isNew"
                class="inline-block align-middle ml-1 px-1 leading-none"
                style="
                  font-size: 10px;
                  font-weight: 700;
                  color: #fff;
                  background-color: var(--pz-color-primary);
                  border-radius: 4px;
                  padding-top: 2px;
                  padding-bottom: 2px;
                "
                aria-label="新上架"
              >NEW</span>
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- 图片工具分组 -->
      <div
        class="pz-sidebar-section"
        :data-expanded="expandedSection === 'image-tools'"
        data-section-id="image-tools"
      >
        <div
          class="pz-sidebar-title"
          role="button"
          tabindex="0"
          @click="toggleSection('image-tools')"
          @keydown="onSectionKeydown($event, 'image-tools')"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            style="color: var(--pz-color-primary)"
            aria-hidden="true"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
          <span>图片工具</span>
          <svg
            class="pz-chevron"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            style="color: var(--pz-color-text-tertiary)"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
        <div id="image-tools-children" class="pz-sidebar-children">
          <div class="flex flex-col gap-0.5 mt-1">
            <NuxtLink
              v-for="link in imageToolsLinks"
              :key="link.to"
              :to="link.to"
              class="pz-sidebar-link"
              :data-active="isLinkActive(link.to)"
              :aria-current="isLinkActive(link.to) ? 'page' : undefined"
            >
              {{ link.label }}
              <span
                v-if="link.isNew"
                class="inline-block align-middle ml-1 px-1 leading-none"
                style="
                  font-size: 10px;
                  font-weight: 700;
                  color: #fff;
                  background-color: var(--pz-color-primary);
                  border-radius: 4px;
                  padding-top: 2px;
                  padding-bottom: 2px;
                "
                aria-label="新上架"
              >NEW</span>
            </NuxtLink>
          </div>
        </div>
      </div>
    </aside>
  </div>
</template>
