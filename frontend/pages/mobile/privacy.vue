<script setup lang="ts">
/**
 * pages/mobile/privacy.vue - 移动端隐私政策页
 *
 * 内容：
 * - 隐私政策内容
 * - 数据处理说明
 * - 本地处理承诺说明
 *
 * 使用移动端布局
 */

definePageMeta({
  layout: 'mobile',
})

useHead({
  titleTemplate: null,
  title: '隐私政策 | 盘子工具站',
  meta: [
    {
      name: 'description',
      content: '盘子工具站隐私政策页面，详细说明本站信息收集、图片处理、数据统计规则，所有工具均在浏览器本地运行，不上传用户数据，全力保护用户隐私安全。',
    },
    {
      name: 'keywords',
      content: '盘子工具站,隐私政策,用户隐私保护',
    },
  ],
})

const sections = [
  {
    id: 'section-1',
    title: '一、信息收集',
    content: '盘子是一个无需登录的在线工具站。我们不要求您注册账户或提供个人身份信息。在您使用工具时，我们不会收集您的工具输入内容或处理结果。',
    items: [
      '不收集：姓名、邮箱、电话等个人信息',
      '不收集：您在工具中输入的文本、代码、图片内容',
      '不收集：工具处理结果和输出数据',
    ],
  },
  {
    id: 'section-2',
    title: '二、图片处理',
    content: '图片压缩、裁剪、格式转换等所有图片工具均在您的浏览器中使用 Canvas API 本地处理。图片文件不会上传到盘子或任何第三方服务器。关闭页面后数据即消失。',
    highlight: '图片处理完全在本地',
  },
  {
    id: 'section-3',
    title: '三、统计与分析',
    content: '为持续改进产品体验，我们采用两套职责分明的统计系统：',
    subsections: [
      {
        title: '百度统计 — 运营分析',
        desc: '由百度收集并处理数据，用于运营分析与产品决策。采集内容包括：页面访问量（PV）与独立访客数（UV）、访问来源与设备类型、工具使用等关键事件埋点。',
        tag: 'info',
      },
      {
        title: '自建统计 — 站内展示',
        desc: '由盘子自建后端收集，仅用于站内展示。采集内容包括：工具使用次数、点赞次数（含匿名访客 ID 防刷）。数据自建存储，不关联个人信息。',
        tag: 'success',
      },
    ],
  },
  {
    id: 'section-4',
    title: '四、Cookie 与存储',
    content: '盘子使用 localStorage 存储以下信息：',
    items: [
      '匿名访客 ID（UUID 格式，用于点赞防刷，不关联个人信息）',
      '用户偏好设置（如工具缩进偏好）',
    ],
    footer: '我们不使用 Cookie 进行广告追踪。您可以随时在浏览器中清除 localStorage 数据。',
  },
  {
    id: 'section-5',
    title: '五、第三方服务',
    content: '我们使用以下第三方服务：',
    table: [
      { name: '百度统计', purpose: '运营分析', data: 'PV/UV、用户行为路径' },
      { name: '广告联盟（待定）', purpose: '展示广告', data: '遵循平台隐私政策' },
    ],
    disclaimer: '本站展示的广告由第三方广告平台提供，我们不对广告内容负责。广告收入用于维持站点运营。',
  },
  {
    id: 'section-6',
    title: '六、政策更新',
    content: '本隐私政策可能不时更新。更新后我们将在本页面公布并更新"最后更新"日期。建议您定期查阅本页面了解最新政策。',
  },
  {
    id: 'section-7',
    title: '七、联系我们',
    content: '如您对本隐私政策有任何疑问，请通过以下方式联系我们：',
    contact: true,
  },
]
</script>

<template>
  <div class="m-privacy">
    <!-- 页面标题 -->
    <section class="m-privacy__header">
      <h1 class="m-privacy__title">隐私政策</h1>
      <p class="m-privacy__update">最后更新：2026年7月</p>
    </section>

    <!-- 隐私声明 Callout -->
    <div class="m-privacy__callout">
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
      <p>
        盘子尊重您的隐私。图片工具的所有处理在浏览器本地完成，不上传服务器。我们仅收集匿名访问统计用于改善产品。
      </p>
    </div>

    <!-- 政策章节 -->
    <div class="m-sections">
      <section
        v-for="sec in sections"
        :key="sec.id"
        :id="sec.id"
        class="m-section"
      >
        <h2 class="m-section__title">{{ sec.title }}</h2>
        <p class="m-section__content" v-if="sec.content">{{ sec.content }}</p>

        <!-- 高亮提示框 -->
        <div v-if="sec.highlight" class="m-highlight">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>{{ sec.highlight }}</span>
        </div>

        <!-- 列表项 -->
        <ul v-if="sec.items" class="m-list">
          <li v-for="(item, i) in sec.items" :key="i">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{{ item }}</span>
          </li>
        </ul>

        <!-- 子区块 -->
        <div v-if="sec.subsections" class="m-subsections">
          <div
            v-for="(sub, i) in sec.subsections"
            :key="i"
            class="m-subsection"
            :class="'m-subsection--' + sub.tag"
          >
            <span class="m-subsection__title">{{ sub.title }}</span>
            <p class="m-subsection__desc">{{ sub.desc }}</p>
          </div>
        </div>

        <!-- 表格 -->
        <div v-if="sec.table" class="m-table-wrap">
          <table class="m-table">
            <thead>
              <tr>
                <th>服务</th>
                <th>用途</th>
                <th>数据收集</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in sec.table" :key="i">
                <td>{{ row.name }}</td>
                <td>{{ row.purpose }}</td>
                <td>{{ row.data }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 免责声明 -->
        <div v-if="sec.disclaimer" class="m-disclaimer">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" x2="12" y1="8" y2="12" />
            <line x1="12" x2="12.01" y1="16" y2="16" />
          </svg>
          <p>{{ sec.disclaimer }}</p>
        </div>

        <!-- 底部补充文字 -->
        <p v-if="sec.footer" class="m-section__content">{{ sec.footer }}</p>

        <!-- 联系方式 -->
        <a
          v-if="sec.contact"
          href="mailto:ly124596@qq.com"
          class="m-contact-link"
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
            aria-hidden="true"
          >
            <rect width="20" height="16" x="2" y="4" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
          ly124596@qq.com
        </a>
      </section>
    </div>

    <!-- 返回链接 -->
    <div class="m-privacy__footer">
      <NuxtLink to="/mobile/about" class="m-privacy__back">
        返回关于页面
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.m-privacy {
  --m-color-primary: #7c3aed;
  --m-color-primary-light: #ede9fe;
  --m-color-primary-lighter: #ddd6fe;
  --m-color-surface: #ffffff;
  --m-color-bg: #f9fafb;
  --m-color-border: #e5e7eb;
  --m-color-border-light: #f3f4f6;
  --m-color-text-primary: #111827;
  --m-color-text-secondary: #6b7280;
  --m-color-text-tertiary: #9ca3af;
  --m-color-info: #3b82f6;
  --m-color-info-bg: #eff6ff;
  --m-color-info-border: #bfdbfe;
  --m-color-success: #10b981;
  --m-color-success-bg: #ecfdf5;
  --m-color-success-border: #a7f3d0;
  --m-color-warning: #f59e0b;
  --m-color-warning-bg: #fffbeb;
  --m-color-warning-border: #fde68a;

  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 0;
}

/* 头部 */
.m-privacy__header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.m-privacy__title {
  font-size: 22px;
  font-weight: 700;
  color: var(--m-color-text-primary);
  margin: 0;
}

.m-privacy__update {
  font-size: 13px;
  color: var(--m-color-text-tertiary);
  margin: 0;
}

/* Callout */
.m-privacy__callout {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px;
  background: var(--m-color-info-bg);
  border: 1px solid var(--m-color-info-border);
  border-radius: 12px;
}

.m-privacy__callout svg {
  color: var(--m-color-info);
  flex-shrink: 0;
  margin-top: 2px;
}

.m-privacy__callout p {
  font-size: 13px;
  color: var(--m-color-text-primary);
  margin: 0;
  line-height: 1.6;
}

/* 章节列表 */
.m-sections {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.m-section {
  background: var(--m-color-surface);
  border: 1px solid var(--m-color-border-light);
  border-radius: 12px;
  padding: 16px;
}

.m-section__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--m-color-text-primary);
  margin: 0 0 8px;
}

.m-section__content {
  font-size: 13px;
  color: var(--m-color-text-primary);
  margin: 0 0 10px;
  line-height: 1.7;
}

/* 高亮框 */
.m-highlight {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  background: var(--m-color-success-bg);
  border: 1px solid var(--m-color-success-border);
  border-radius: 10px;
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 500;
  color: var(--m-color-success);
}

.m-highlight svg {
  flex-shrink: 0;
}

/* 列表 */
.m-list {
  list-style: none;
  padding: 0;
  margin: 0 0 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.m-list li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: var(--m-color-text-secondary);
  line-height: 1.6;
}

.m-list svg {
  color: var(--m-color-success);
  flex-shrink: 0;
  margin-top: 2px;
}

/* 子区块 */
.m-subsections {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 10px;
}

.m-subsection {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid transparent;
}

.m-subsection--info {
  background: var(--m-color-info-bg);
  border-color: var(--m-color-info-border);
}

.m-subsection--success {
  background: var(--m-color-success-bg);
  border-color: var(--m-color-success-border);
}

.m-subsection__title {
  display: block;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 6px;
}

.m-subsection--info .m-subsection__title {
  color: var(--m-color-info);
}

.m-subsection--success .m-subsection__title {
  color: var(--m-color-success);
}

.m-subsection__desc {
  font-size: 13px;
  color: var(--m-color-text-primary);
  margin: 0;
  line-height: 1.6;
}

/* 表格 */
.m-table-wrap {
  overflow-x: auto;
  margin-bottom: 10px;
  border: 1px solid var(--m-color-border);
  border-radius: 10px;
}

.m-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  min-width: 480px;
}

.m-table th {
  text-align: left;
  padding: 10px 12px;
  font-weight: 500;
  color: var(--m-color-text-secondary);
  background: var(--m-color-bg);
  font-size: 13px;
  white-space: nowrap;
}

.m-table td {
  padding: 10px 12px;
  color: var(--m-color-text-primary);
  border-bottom: 1px solid var(--m-color-border-light);
  white-space: nowrap;
}

.m-table tr:last-child td {
  border-bottom: none;
}

.m-table td:last-child {
  color: var(--m-color-text-secondary);
}

/* 免责声明 */
.m-disclaimer {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  background: var(--m-color-info-bg);
  border: 1px solid var(--m-color-info-border);
  border-radius: 10px;
  margin-bottom: 10px;
}

.m-disclaimer svg {
  color: var(--m-color-info);
  flex-shrink: 0;
  margin-top: 2px;
}

.m-disclaimer p {
  font-size: 13px;
  color: var(--m-color-text-primary);
  margin: 0;
  line-height: 1.6;
}

/* 联系链接 */
.m-contact-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  color: var(--m-color-primary);
  text-decoration: none;
  min-height: 44px;
}

.m-contact-link:active {
  opacity: 0.7;
}

.m-contact-link svg {
  flex-shrink: 0;
}

/* 底部 */
.m-privacy__footer {
  padding: 8px 0;
  text-align: center;
}

.m-privacy__back {
  font-size: 14px;
  color: var(--m-color-primary);
  text-decoration: none;
  font-weight: 500;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
}
</style>