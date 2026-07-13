<script setup lang="ts">
/**
 * pages/privacy.vue - 隐私政策页
 *
 * 严格参照 ui/pages/隐私政策.html 的布局
 * - 面包屑：首页 > 隐私政策
 * - 隐私声明 callout（info 状态背景）
 * - 双栏布局：左侧 TOC 导航 + 右侧内容
 * - 7 个章节：信息收集、图片处理、统计与分析、Cookie与存储、第三方服务、政策更新、联系我们
 */

useSeoMeta({
  title: '隐私政策',
  description:
    'PanziPool 尊重您的隐私。图片工具的所有处理在浏览器本地完成，不上传服务器。我们仅收集匿名访问统计用于改善产品。',
})
</script>

<template>
  <!-- ============ 面包屑 ============ -->
  <nav
    class="flex items-center gap-2 mb-6"
    aria-label="面包屑导航"
  >
    <NuxtLink to="/" class="pz-footer-link" style="font-size: var(--pz-text-sm)">首页</NuxtLink>
    <span class="text-sm" style="color: var(--pz-color-text-tertiary)">/</span>
    <span
      class="text-sm font-medium"
      style="color: var(--pz-color-text-primary); font-family: var(--pz-font-sans)"
    >
      隐私政策
    </span>
  </nav>

  <!-- ============ 页面标题 ============ -->
  <div class="py-6">
    <h1
      class="text-3xl font-bold"
      style="color: var(--pz-color-text-primary); font-family: var(--pz-font-display); text-wrap: balance; word-break: keep-all; overflow-wrap: break-word"
    >
      隐私政策
    </h1>
    <p
      class="text-sm mt-2"
      style="color: var(--pz-color-text-tertiary); font-family: var(--pz-font-sans)"
    >
      最后更新：2026年7月
    </p>
  </div>

  <!-- ============ 隐私声明 Callout ============ -->
  <div
    class="p-4 flex items-start gap-3 mb-8"
    style="background-color: var(--pz-state-info-bg); border: 1px solid var(--pz-state-info-border); border-radius: var(--pz-radius-lg)"
  >
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="shrink-0"
      style="color: var(--pz-state-info); flex-shrink: 0"
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
    <p
      class="text-sm"
      style="color: var(--pz-color-text-primary); font-family: var(--pz-font-sans); line-height: 1.6"
    >
      PanziPool 尊重您的隐私。图片工具的所有处理在浏览器本地完成，不上传服务器。我们仅收集匿名访问统计用于改善产品。
    </p>
  </div>

  <!-- ============ 双栏布局：TOC 侧边栏 + 内容 ============ -->
  <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
    <!-- 左侧 TOC 导航 -->
    <aside class="lg:col-span-1">
      <nav class="lg:sticky lg:top-6 flex flex-col gap-1" aria-label="隐私政策目录">
        <a
          v-for="section in sections"
          :key="section.id"
          :href="`#${section.id}`"
          class="pz-toc-link"
        >
          {{ section.label }}
        </a>
      </nav>
    </aside>

    <!-- 右侧内容 -->
    <div class="lg:col-span-3 flex flex-col gap-8">
      <!-- Section 1: 信息收集 -->
      <section id="section-1" class="scroll-mt-6">
        <h2
          class="text-xl font-semibold mb-4"
          style="color: var(--pz-color-text-primary); font-family: var(--pz-font-display); text-wrap: balance; word-break: keep-all"
        >
          一、信息收集
        </h2>
        <p
          class="text-sm mb-4"
          style="color: var(--pz-color-text-primary); font-family: var(--pz-font-sans); line-height: 1.7"
        >
          PanziPool 是一个无需登录的在线工具站。我们不要求您注册账户或提供个人身份信息。在您使用工具时，我们不会收集您的工具输入内容或处理结果。
        </p>
        <ul class="flex flex-col gap-2">
          <li class="flex items-start gap-2.5">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="shrink-0"
              style="color: var(--pz-state-success); flex-shrink: 0; margin-top: 2px"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span
              class="text-sm"
              style="color: var(--pz-color-text-secondary); font-family: var(--pz-font-sans); line-height: 1.6"
            >
              不收集：姓名、邮箱、电话等个人信息
            </span>
          </li>
          <li class="flex items-start gap-2.5">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="shrink-0"
              style="color: var(--pz-state-success); flex-shrink: 0; margin-top: 2px"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span
              class="text-sm"
              style="color: var(--pz-color-text-secondary); font-family: var(--pz-font-sans); line-height: 1.6"
            >
              不收集：您在工具中输入的文本、代码、图片内容
            </span>
          </li>
          <li class="flex items-start gap-2.5">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="shrink-0"
              style="color: var(--pz-state-success); flex-shrink: 0; margin-top: 2px"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span
              class="text-sm"
              style="color: var(--pz-color-text-secondary); font-family: var(--pz-font-sans); line-height: 1.6"
            >
              不收集：工具处理结果和输出数据
            </span>
          </li>
        </ul>
      </section>

      <!-- Section 2: 图片处理 -->
      <section id="section-2" class="scroll-mt-6">
        <h2
          class="text-xl font-semibold mb-4"
          style="color: var(--pz-color-text-primary); font-family: var(--pz-font-display); text-wrap: balance; word-break: keep-all"
        >
          二、图片处理
        </h2>
        <div
          class="p-4 mb-4"
          style="background-color: var(--pz-state-success-bg); border: 1px solid var(--pz-state-success-border); border-radius: var(--pz-radius-lg)"
        >
          <div class="flex items-center gap-2 mb-2">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="shrink-0"
              style="color: var(--pz-state-success); flex-shrink: 0"
              aria-hidden="true"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span
              class="font-medium text-sm"
              style="color: var(--pz-state-success); font-family: var(--pz-font-sans)"
            >
              图片处理完全在本地
            </span>
          </div>
          <p
            class="text-sm"
            style="color: var(--pz-color-text-primary); font-family: var(--pz-font-sans); line-height: 1.6"
          >
            图片压缩、裁剪、格式转换等所有图片工具均在您的浏览器中使用 Canvas API 本地处理。图片文件不会上传到 PanziPool 或任何第三方服务器。关闭页面后数据即消失。
          </p>
        </div>
        <p
          class="text-sm"
          style="color: var(--pz-color-text-primary); font-family: var(--pz-font-sans); line-height: 1.7"
        >
          我们使用浏览器原生的 Canvas API 和 Web Crypto API 实现图片处理功能。您的图片数据始终保留在本地设备上。
        </p>
      </section>

      <!-- Section 3: 统计与分析 -->
      <section id="section-3" class="scroll-mt-6">
        <h2
          class="text-xl font-semibold mb-4"
          style="color: var(--pz-color-text-primary); font-family: var(--pz-font-display); text-wrap: balance; word-break: keep-all"
        >
          三、统计与分析
        </h2>
        <p
          class="text-sm mb-4"
          style="color: var(--pz-color-text-primary); font-family: var(--pz-font-sans); line-height: 1.7"
        >
          为持续改进产品体验，我们采用两套职责分明的统计系统，互不干扰：
        </p>

        <!-- 百度统计（运营分析） -->
        <div
          class="p-4 mb-4"
          style="background-color: var(--pz-state-info-bg); border: 1px solid var(--pz-state-info-border); border-radius: var(--pz-radius-lg)"
        >
          <div class="flex items-center gap-2 mb-2">
            <span
              class="font-medium text-sm"
              style="color: var(--pz-state-info); font-family: var(--pz-font-sans)"
            >
              百度统计 — 运营分析
            </span>
          </div>
          <p
            class="text-sm mb-3"
            style="color: var(--pz-color-text-primary); font-family: var(--pz-font-sans); line-height: 1.6"
          >
            由百度收集并处理数据，用于运营分析与产品决策。采集内容包括：
          </p>
          <ul class="flex flex-col gap-2 mb-3">
            <li class="flex items-start gap-2.5">
              <span
                class="shrink-0"
                style="width: 6px; height: 6px; border-radius: var(--pz-radius-full); background-color: var(--pz-state-info); margin-top: 8px; flex-shrink: 0"
              />
              <span
                class="text-sm"
                style="color: var(--pz-color-text-secondary); font-family: var(--pz-font-sans); line-height: 1.6"
              >
                页面访问量（PV）与独立访客数（UV）
              </span>
            </li>
            <li class="flex items-start gap-2.5">
              <span
                class="shrink-0"
                style="width: 6px; height: 6px; border-radius: var(--pz-radius-full); background-color: var(--pz-state-info); margin-top: 8px; flex-shrink: 0"
              />
              <span
                class="text-sm"
                style="color: var(--pz-color-text-secondary); font-family: var(--pz-font-sans); line-height: 1.6"
              >
                访问来源、设备类型与用户行为路径
              </span>
            </li>
            <li class="flex items-start gap-2.5">
              <span
                class="shrink-0"
                style="width: 6px; height: 6px; border-radius: var(--pz-radius-full); background-color: var(--pz-state-info); margin-top: 8px; flex-shrink: 0"
              />
              <span
                class="text-sm"
                style="color: var(--pz-color-text-secondary); font-family: var(--pz-font-sans); line-height: 1.6"
              >
                工具使用、复制、下载等关键事件埋点
              </span>
            </li>
          </ul>
          <p
            class="text-sm"
            style="color: var(--pz-color-text-secondary); font-family: var(--pz-font-sans); line-height: 1.6"
          >
            数据由百度收集存储，PanziPool 仅查看聚合统计报告，不获取原始个人数据。
          </p>
        </div>

        <!-- 自建统计（站内展示） -->
        <div
          class="p-4 mb-4"
          style="background-color: var(--pz-state-success-bg); border: 1px solid var(--pz-state-success-border); border-radius: var(--pz-radius-lg)"
        >
          <div class="flex items-center gap-2 mb-2">
            <span
              class="font-medium text-sm"
              style="color: var(--pz-state-success); font-family: var(--pz-font-sans)"
            >
              自建统计 — 站内展示
            </span>
          </div>
          <p
            class="text-sm mb-3"
            style="color: var(--pz-color-text-primary); font-family: var(--pz-font-sans); line-height: 1.6"
          >
            由 PanziPool 自建后端收集，仅用于站内展示，不上传至任何第三方。采集内容包括：
          </p>
          <ul class="flex flex-col gap-2 mb-3">
            <li class="flex items-start gap-2.5">
              <span
                class="shrink-0"
                style="width: 6px; height: 6px; border-radius: var(--pz-radius-full); background-color: var(--pz-state-success); margin-top: 8px; flex-shrink: 0"
              />
              <span
                class="text-sm"
                style="color: var(--pz-color-text-secondary); font-family: var(--pz-font-sans); line-height: 1.6"
              >
                工具使用次数（展示于工具卡片与详情页）
              </span>
            </li>
            <li class="flex items-start gap-2.5">
              <span
                class="shrink-0"
                style="width: 6px; height: 6px; border-radius: var(--pz-radius-full); background-color: var(--pz-state-success); margin-top: 8px; flex-shrink: 0"
              />
              <span
                class="text-sm"
                style="color: var(--pz-color-text-secondary); font-family: var(--pz-font-sans); line-height: 1.6"
              >
                点赞次数（展示于工具卡片，含匿名访客 ID 防刷）
              </span>
            </li>
          </ul>
          <p
            class="text-sm"
            style="color: var(--pz-color-text-secondary); font-family: var(--pz-font-sans); line-height: 1.6"
          >
            数据自建存储，仅记录匿名访客 ID（UUID）与事件类型，不关联个人信息，不上传工具输入内容或处理结果。
          </p>
        </div>

        <p
          class="text-sm"
          style="color: var(--pz-color-text-primary); font-family: var(--pz-font-sans); line-height: 1.7"
        >
          我们不收集：您的 IP 地址精确位置、浏览历史、工具输入内容。所有统计仅用于聚合分析，不与个人身份关联。
        </p>
      </section>

      <!-- Section 4: Cookie与存储 -->
      <section id="section-4" class="scroll-mt-6">
        <h2
          class="text-xl font-semibold mb-4"
          style="color: var(--pz-color-text-primary); font-family: var(--pz-font-display); text-wrap: balance; word-break: keep-all"
        >
          四、Cookie与存储
        </h2>
        <p
          class="text-sm mb-4"
          style="color: var(--pz-color-text-primary); font-family: var(--pz-font-sans); line-height: 1.7"
        >
          PanziPool 使用 localStorage 存储以下信息：
        </p>
        <ul class="flex flex-col gap-2 mb-4">
          <li class="flex items-start gap-2.5">
            <span
              class="shrink-0"
              style="width: 6px; height: 6px; border-radius: var(--pz-radius-full); background-color: var(--pz-color-primary); margin-top: 8px; flex-shrink: 0"
            />
            <span
              class="text-sm"
              style="color: var(--pz-color-text-secondary); font-family: var(--pz-font-sans); line-height: 1.6"
            >
              匿名访客 ID（UUID 格式，用于点赞防刷，不关联个人信息）
            </span>
          </li>
          <li class="flex items-start gap-2.5">
            <span
              class="shrink-0"
              style="width: 6px; height: 6px; border-radius: var(--pz-radius-full); background-color: var(--pz-color-primary); margin-top: 8px; flex-shrink: 0"
            />
            <span
              class="text-sm"
              style="color: var(--pz-color-text-secondary); font-family: var(--pz-font-sans); line-height: 1.6"
            >
              用户偏好设置（如工具缩进偏好）
            </span>
          </li>
        </ul>
        <p
          class="text-sm"
          style="color: var(--pz-color-text-primary); font-family: var(--pz-font-sans); line-height: 1.7"
        >
          我们不使用 Cookie 进行广告追踪。您可以随时在浏览器中清除 localStorage 数据。
        </p>
      </section>

      <!-- Section 5: 第三方服务 -->
      <section id="section-5" class="scroll-mt-6">
        <h2
          class="text-xl font-semibold mb-4"
          style="color: var(--pz-color-text-primary); font-family: var(--pz-font-display); text-wrap: balance; word-break: keep-all"
        >
          五、第三方服务
        </h2>
        <p
          class="text-sm mb-4"
          style="color: var(--pz-color-text-primary); font-family: var(--pz-font-sans); line-height: 1.7"
        >
          我们使用以下第三方服务：
        </p>
        <div
          class="overflow-x-auto"
          style="border: 1px solid var(--pz-color-border); border-radius: var(--pz-radius-lg)"
        >
          <table
            class="w-full text-sm"
            style="border-collapse: collapse; font-family: var(--pz-font-sans); min-width: 480px"
          >
            <thead>
              <tr style="border-bottom: 1px solid var(--pz-color-border-strong)">
                <th
                  class="text-left py-3 px-4 font-medium whitespace-nowrap"
                  style="color: var(--pz-color-text-secondary); background-color: var(--pz-color-bg-secondary); min-width: 120px"
                >
                  服务
                </th>
                <th
                  class="text-left py-3 px-4 font-medium whitespace-nowrap"
                  style="color: var(--pz-color-text-secondary); background-color: var(--pz-color-bg-secondary); min-width: 100px"
                >
                  用途
                </th>
                <th
                  class="text-left py-3 px-4 font-medium whitespace-nowrap"
                  style="color: var(--pz-color-text-secondary); background-color: var(--pz-color-bg-secondary); min-width: 160px"
                >
                  数据收集
                </th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid var(--pz-color-border)">
                <td class="py-3 px-4 whitespace-nowrap" style="color: var(--pz-color-text-primary)">
                  百度统计
                </td>
                <td class="py-3 px-4" style="color: var(--pz-color-text-secondary)">运营分析</td>
                <td class="py-3 px-4" style="color: var(--pz-color-text-secondary)">PV/UV、用户行为路径</td>
              </tr>
              <tr>
                <td class="py-3 px-4 whitespace-nowrap" style="color: var(--pz-color-text-primary)">
                  广告联盟（待定）
                </td>
                <td class="py-3 px-4" style="color: var(--pz-color-text-secondary)">展示广告</td>
                <td class="py-3 px-4" style="color: var(--pz-color-text-secondary)">
                  遵循平台隐私政策
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 广告免责声明 -->
        <div
          class="p-4 mt-4 flex items-start gap-3"
          style="background-color: var(--pz-state-info-bg); border: 1px solid var(--pz-state-info-border); border-radius: var(--pz-radius-lg)"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="shrink-0"
            style="color: var(--pz-state-info); flex-shrink: 0; margin-top: 1px"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" x2="12" y1="8" y2="12" />
            <line x1="12" x2="12.01" y1="16" y2="16" />
          </svg>
          <p
            class="text-sm"
            style="color: var(--pz-color-text-primary); font-family: var(--pz-font-sans); line-height: 1.6"
          >
            本站展示的广告由第三方广告平台提供，我们不对广告内容负责。广告收入用于维持站点运营。
          </p>
        </div>
      </section>

      <!-- Section 6: 政策更新 -->
      <section id="section-6" class="scroll-mt-6">
        <h2
          class="text-xl font-semibold mb-4"
          style="color: var(--pz-color-text-primary); font-family: var(--pz-font-display); text-wrap: balance; word-break: keep-all"
        >
          六、政策更新
        </h2>
        <p
          class="text-sm"
          style="color: var(--pz-color-text-primary); font-family: var(--pz-font-sans); line-height: 1.7"
        >
          本隐私政策可能不时更新。更新后我们将在本页面公布并更新"最后更新"日期。建议您定期查阅本页面了解最新政策。
        </p>
      </section>

      <!-- Section 7: 联系我们 -->
      <section id="section-7" class="scroll-mt-6">
        <h2
          class="text-xl font-semibold mb-4"
          style="color: var(--pz-color-text-primary); font-family: var(--pz-font-display); text-wrap: balance; word-break: keep-all"
        >
          七、联系我们
        </h2>
        <p
          class="text-sm mb-3"
          style="color: var(--pz-color-text-primary); font-family: var(--pz-font-sans); line-height: 1.7"
        >
          如您对本隐私政策有任何疑问，请通过以下方式联系我们：
        </p>
        <a
          href="mailto:feedback@panzipool.com"
          class="inline-flex items-center gap-2 text-sm"
          style="font-family: var(--pz-font-mono); color: var(--pz-color-primary); text-decoration: none; transition: color 0.15s ease"
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
            class="shrink-0"
            style="color: var(--pz-color-primary); flex-shrink: 0"
            aria-hidden="true"
          >
            <rect width="20" height="16" x="2" y="4" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
          <span>feedback@panzipool.com</span>
        </a>
      </section>
    </div>
  </div>
</template>

<script lang="ts">
/**
 * TOC 数据结构（非响应式静态数据，放在普通 script 块中）
 */
const sections = [
  { id: 'section-1', label: '一、信息收集' },
  { id: 'section-2', label: '二、图片处理' },
  { id: 'section-3', label: '三、统计与分析' },
  { id: 'section-4', label: '四、Cookie与存储' },
  { id: 'section-5', label: '五、第三方服务' },
  { id: 'section-6', label: '六、政策更新' },
  { id: 'section-7', label: '七、联系我们' },
]
</script>

<style scoped>
/* TOC 链接样式（参照 HTML 中的 .pz-toc-link） */
.pz-toc-link {
  display: block;
  font-family: var(--pz-font-sans);
  font-size: var(--pz-text-sm);
  color: var(--pz-color-text-secondary);
  padding: 0.5rem 0.75rem;
  border-radius: var(--pz-radius-md);
  text-decoration: none;
  transition:
    color 0.15s ease,
    background-color 0.15s ease;
  white-space: nowrap;
}

.pz-toc-link:hover {
  color: var(--pz-color-text-primary);
  background-color: var(--pz-color-bg-secondary);
}

.pz-toc-link[data-active='true'] {
  color: var(--pz-color-primary);
  background-color: var(--pz-color-primary-light);
  font-weight: var(--pz-weight-medium);
}
</style>
