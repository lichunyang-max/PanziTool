<script setup lang="ts">
/**
 * pages/mobile/about.vue - 移动端关于页
 *
 * 内容：
 * - 站点介绍
 * - 特色功能列表
 * - 使用说明
 * - 联系/反馈方式
 *
 * 使用移动端布局
 */

definePageMeta({
  layout: 'mobile',
})

useHead({
  titleTemplate: null,
  title: '关于我们 | 盘子工具站',
  meta: [
    {
      name: 'description',
      content: '盘子工具站是面向中文开发者的免费在线工具聚合站，提供开发者工具与图片处理工具，所有工具免登录、本地处理、保护隐私。',
    },
    {
      name: 'keywords',
      content: '盘子工具站,关于我们,在线工具站介绍',
    },
  ],
})

const features = [
  {
    icon: 'instant',
    title: '即开即用',
    desc: '无需安装，浏览器打开即可使用所有工具',
  },
  {
    icon: 'shield',
    title: '隐私安全',
    desc: '图片工具本地处理，不上传服务器，保护数据隐私',
  },
  {
    icon: 'search',
    title: '快速查找',
    desc: '分类清晰，支持搜索，快速找到所需工具',
  },
  {
    icon: 'image',
    title: '图片处理',
    desc: '压缩、裁剪、格式转换，一站式图片处理工具',
  },
  {
    icon: 'code',
    title: '开发者工具',
    desc: 'JSON、正则、编码解码，覆盖日常开发需求',
  },
  {
    icon: 'free',
    title: '完全免费',
    desc: '所有功能 100% 免费，无广告骚扰',
  },
]

const faqs = [
  {
    q: '盘子工具站是什么？',
    a: '盘子工具站是一个面向中文开发者的在线工具聚合站，提供开发者工具（JSON格式化、正则测试、编码解码等）和图片处理工具（压缩、裁剪、格式转换等）。',
  },
  {
    q: '需要注册账号吗？',
    a: '不需要。盘子工具站所有工具均无需注册登录，打开即用，匿名使用。',
  },
  {
    q: '我的数据会被上传吗？',
    a: '不会。图片工具完全在浏览器本地处理，使用 Canvas API，您的图片数据不会上传到任何服务器。开发者工具的输入数据也仅在浏览器本地处理。',
  },
  {
    q: '支持哪些图片格式？',
    a: '支持 JPEG、PNG、WebP 格式的输入和输出。可在工具中自由选择目标格式。',
  },
  {
    q: '为什么工具是免费的？',
    a: '盘子工具站致力于为开发者提供便捷的工具集合。站点通过少量广告展示维持运营，所有核心功能完全免费。',
  },
]
</script>

<template>
  <div class="m-about">
    <!-- 站点介绍 -->
    <section class="m-about__hero">
      <div class="m-about__logo" aria-hidden="true">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          stroke-width="2.5"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      </div>
      <h1 class="m-about__title">关于 盘子工具站</h1>
      <p class="m-about__slogan">高效开发，随手即达</p>
      <p class="m-about__desc">
        面向中文开发者的免费在线工具集合，提供开发者工具与图片处理工具，免登录打开即用，本地处理保护隐私
      </p>
    </section>

    <!-- 特色功能 -->
    <section class="m-about__section">
      <h2 class="m-about__subtitle">特色功能</h2>
      <div class="m-features">
        <div v-for="f in features" :key="f.icon" class="m-feature">
          <div class="m-feature__icon" :class="'m-feature__icon--' + f.icon">
            <svg v-if="f.icon === 'instant'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <svg v-else-if="f.icon === 'shield'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <svg v-else-if="f.icon === 'search'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <svg v-else-if="f.icon === 'image'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
            <svg v-else-if="f.icon === 'code'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
            <svg v-else-if="f.icon === 'free'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
          </div>
          <div class="m-feature__info">
            <span class="m-feature__title">{{ f.title }}</span>
            <span class="m-feature__desc">{{ f.desc }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 使用说明 -->
    <section class="m-about__section">
      <h2 class="m-about__subtitle">使用说明</h2>
      <div class="m-faq">
        <details
          v-for="(faq, index) in faqs"
          :key="index"
          class="m-faq__item"
          :open="index === 0"
        >
          <summary class="m-faq__question">
            {{ faq.q }}
            <svg
              class="m-faq__chevron"
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
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </summary>
          <p class="m-faq__answer">{{ faq.a }}</p>
        </details>
      </div>
    </section>

    <!-- 联系方式 -->
    <section class="m-about__section">
      <h2 class="m-about__subtitle">联系我们</h2>
      <div class="m-contact">
        <div class="m-contact__item">
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
            <rect width="20" height="16" x="2" y="4" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
          <a href="mailto:ly124596@qq.com" class="m-contact__link">ly124596@qq.com</a>
        </div>
        <p class="m-contact__desc">
          如有工具建议、问题反馈或合作意向，欢迎通过邮件联系我们。
        </p>
        <NuxtLink to="/mobile/privacy" class="m-contact__privacy">
          查看隐私政策
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.m-about {
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

  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 16px 0;
}

/* 站点介绍 */
.m-about__hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 0;
  text-align: center;
}

.m-about__logo {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: var(--m-color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.m-about__title {
  font-size: 20px;
  font-weight: 700;
  color: var(--m-color-text-primary);
  margin: 0;
}

.m-about__slogan {
  font-size: 16px;
  font-weight: 600;
  color: var(--m-color-primary);
  margin: 0;
}

.m-about__desc {
  font-size: 13px;
  color: var(--m-color-text-secondary);
  margin: 4px 0 0;
  line-height: 1.6;
  max-width: 320px;
}

/* 区块 */
.m-about__section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.m-about__subtitle {
  font-size: 17px;
  font-weight: 600;
  color: var(--m-color-text-primary);
  margin: 0;
}

/* 特色功能 */
.m-features {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.m-feature {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  background: var(--m-color-surface);
  border: 1px solid var(--m-color-border-light);
  border-radius: 12px;
}

.m-feature__icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--m-color-primary);
}

.m-feature__icon--instant {
  background: #fef3c7;
  color: #f59e0b;
}

.m-feature__icon--shield {
  background: #d1fae5;
  color: #10b981;
}

.m-feature__icon--search {
  background: var(--m-color-primary-light);
  color: var(--m-color-primary);
}

.m-feature__icon--image {
  background: #ffe4e6;
  color: #f43f5e;
}

.m-feature__icon--code {
  background: #dbeafe;
  color: #3b82f6;
}

.m-feature__icon--free {
  background: #fef3c7;
  color: #d97706;
}

.m-feature__info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.m-feature__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--m-color-text-primary);
}

.m-feature__desc {
  font-size: 13px;
  color: var(--m-color-text-secondary);
  line-height: 1.5;
}

/* FAQ */
.m-faq {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.m-faq__item {
  background: var(--m-color-surface);
  border: 1px solid var(--m-color-border-light);
  border-radius: 10px;
  padding: 12px 14px;
}

.m-faq__question {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--m-color-text-primary);
  cursor: pointer;
  list-style: none;
  min-height: 44px;
  line-height: 1.4;
}

.m-faq__question::-webkit-details-marker {
  display: none;
}

.m-faq__chevron {
  color: var(--m-color-text-tertiary);
  flex-shrink: 0;
  transition: transform 0.15s ease;
}

.m-faq__item[open] .m-faq__chevron {
  transform: rotate(180deg);
}

.m-faq__answer {
  font-size: 13px;
  color: var(--m-color-text-secondary);
  margin: 8px 0 0;
  line-height: 1.6;
}

/* 联系方式 */
.m-contact {
  background: var(--m-color-surface);
  border: 1px solid var(--m-color-border-light);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.m-contact__item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.m-contact__item svg {
  color: var(--m-color-primary);
  flex-shrink: 0;
}

.m-contact__link {
  font-size: 14px;
  font-weight: 500;
  color: var(--m-color-text-primary);
  text-decoration: none;
  word-break: break-all;
}

.m-contact__link:active {
  color: var(--m-color-primary);
}

.m-contact__desc {
  font-size: 13px;
  color: var(--m-color-text-secondary);
  margin: 0;
  line-height: 1.6;
}

.m-contact__privacy {
  font-size: 14px;
  color: var(--m-color-primary);
  text-decoration: none;
  font-weight: 500;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
}
</style>