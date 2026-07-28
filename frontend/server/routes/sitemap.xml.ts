/**
 * server/routes/sitemap.xml.ts - 动态生成 sitemap
 *
 * 包含首页、分类页、所有工具页的 URL
 * 从后端 API 获取工具列表生成工具页 URL
 */
export default defineEventHandler(async () => {
  const baseUrl = 'https://tool.panzipool.com'

  // 静态页面
  const staticUrls = [
    { loc: baseUrl, priority: '1.0', changefreq: 'daily' },
    { loc: `${baseUrl}/category/developer`, priority: '0.9', changefreq: 'daily' },
    { loc: `${baseUrl}/category/image`, priority: '0.9', changefreq: 'daily' },
    { loc: `${baseUrl}/about`, priority: '0.5', changefreq: 'monthly' },
    { loc: `${baseUrl}/privacy`, priority: '0.3', changefreq: 'monthly' },
  ]

  // 尝试获取工具列表
  let toolUrls: { loc: string; priority: string; changefreq: string }[] = []
  try {
    const config = useRuntimeConfig()
    const apiBase = config.apiBase || config.public.apiBase || 'http://localhost:8080'
    const response = await $fetch<{
      code: number
      data: { items: { slug: string; updated_at?: string }[]; total: number }
    }>('/api/v1/tools', { baseURL: apiBase as string })
    if (response.code === 0 && response.data?.items) {
      toolUrls = response.data.items.map((tool) => ({
        loc: `${baseUrl}/tools/${tool.slug}`,
        priority: '0.8',
        changefreq: 'weekly',
      }))
    }
  } catch {
    // 后端不可用时，使用预定义的工具 slug 列表
    const knownSlugs = [
      'json-formatter',
      'regex-tester',
      'timestamp',
      'url-encode',
      'jwt-decoder',
      'base64',
      'hash',
      'image-compress',
      'image-crop',
      'image-convert',
    ]
    toolUrls = knownSlugs.map((slug) => ({
      loc: `${baseUrl}/tools/${slug}`,
      priority: '0.8',
      changefreq: 'weekly',
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
