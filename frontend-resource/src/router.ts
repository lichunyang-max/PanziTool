import { createRouter, createWebHistory } from 'vue-router'

/**
 * 路由：
 * - /                资源列表页（左目录 + 右资源网格）
 * - /resource/:id    资源详情页
 */
export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('./pages/Home.vue'),
    },
    {
      path: '/resource/:id',
      name: 'resource-detail',
      component: () => import('./pages/ResourceDetail.vue'),
      props: true,
    },
    {
      // 未知路径回首页
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})
