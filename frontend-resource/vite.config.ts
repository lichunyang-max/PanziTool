import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    // 开发环境代理：/api → 本地后端，模拟线上 Nginx 反代
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    // 打包输出目录：dist（部署时上传到服务器 nginx 静态目录）
    outDir: 'dist',
    assetsDir: 'assets',
    // 小于 4KB 的资源内联为 base64，减少请求数
    assetsInlineLimit: 4096,
  },
})
