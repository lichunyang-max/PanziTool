/// <reference types="vite/client" />

/**
 * 自定义环境变量类型声明。
 *
 * - VITE_API_BASE：API 基址（默认空 = 相对路径，由 Nginx 同域反代）
 */
interface ImportMetaEnv {
  readonly VITE_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
