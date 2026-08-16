/**
 * server/routes/sitemap.xml.ts - 动态生成 sitemap
 *
 * 包含首页、分类页、所有工具页的 URL
 * 从后端 API 获取工具列表生成工具页 URL，API 不可用时降级到 toolStaticMeta
 */
import { toolStaticMeta } from '~/utils/toolMeta'

export default defineEventHandler(async () => {
  const baseUrl = 'https://tool.panzipool.com'
  const today = new Date().toISOString().split('T')[0]

  // 静态页面
  const staticUrls = [
    { loc: baseUrl, priority: '1.0', changefreq: 'daily', lastmod: today },
    { loc: `${baseUrl}/category/developer`, priority: '0.9', changefreq: 'weekly', lastmod: today },
    { loc: `${baseUrl}/category/image`, priority: '0.9', changefreq: 'weekly', lastmod: today },
    { loc: `${baseUrl}/about`, priority: '0.5', changefreq: 'monthly', lastmod: today },
    { loc: `${baseUrl}/privacy`, priority: '0.3', changefreq: 'monthly', lastmod: today },
  ]

  // 静态元数据中的所有 slug（作为降级数据源，确保预渲染时 sitemap 完整）
  const staticSlugs = Object.keys(toolStaticMeta)

  // 尝试获取工具列表
  let toolUrls: { loc: string; priority: string; changefreq: string; lastmod: string }[] = []
  try {
    const config = useRuntimeConfig()
    const apiBase = config.apiBase || config.public.apiBase || 'http://localhost:8080'
    const response = await $fetch<{
      code: number
      data: { items: { slug: string; updated_at?: string }[]; total: number }
    }>('/api/v1/tools', { baseURL: apiBase as string })
    if (response.code === 0 && response.data?.items) {
      const apiSlugs = response.data.items.map((t) => t.slug)
      // 合并 API slug 和静态 slug，去重
      const allSlugs = [...new Set([...apiSlugs, ...staticSlugs])]
      toolUrls = allSlugs.map((slug) => ({
        loc: `${baseUrl}/tools/${slug}`,
        priority: '0.8',
        changefreq: 'weekly',
        lastmod: today,
      }))
    } else {
      throw new Error('API returned non-zero code')
    }
  } catch {
    // 后端不可用时，使用静态元数据中的所有 slug
    toolUrls = staticSlugs.map((slug) => ({
      loc: `${baseUrl}/tools/${slug}`,
      priority: '0.8',
      changefreq: 'weekly',
      lastmod: today,
    }))
  }

  const allUrls = [...staticUrls, ...toolUrls]

  // 生成 XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
  .map(
    (url) =>
      `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <priority>${url.priority}</priority>
    <changefreq>${url.changefreq}</changefreq>
  </url>`,
  )
  .join('\n')}
</urlset>
`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
})
