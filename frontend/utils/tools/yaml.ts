/**
 * yaml.ts - YAML 格式化/校验/转JSON 纯函数
 *
 * 依赖 js-yaml，忠实移植自 panziui/tools/yaml-formatter.html 的内联脚本：
 * - formatYaml：解析后用 dump 重新输出（支持多文档，indent 2/4，lineWidth -1，noRefs）
 * - validateYaml：解析校验，错误提取行号并给出友好提示
 * - yamlToJson：解析后输出格式化 JSON（多文档输出为数组）
 *
 * 错误行号提示策略移植自 HTML 的 normalizeError：js-yaml 报错行号通常指向
 * 「发现问题的位置」，问题根源可能在上一行，故提示连同上一行一起检查。
 */
import yaml from 'js-yaml'

/** 操作结果 */
export interface YamlResult {
  success: boolean
  output?: string
  error?: string
}

/** 将 js-yaml 异常转为带行号提示的中文错误信息 */
function normalizeError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  const m = msg.match(/line (\d+)/i)
  if (m) return `${msg}（请检查第 ${m[1]} 行及其上一行的缩进与语法）`
  return msg
}

/**
 * 格式化 YAML 字符串（美化输出）
 *
 * 支持多文档（--- 分隔）：逐个 dump 后以 --- 重新拼接，空文档被过滤。
 *
 * @param input 输入 YAML 字符串
 * @param indent 缩进空格数（2 或 4），默认 2；非 4 时回退为 2
 * @returns 格式化结果，失败时返回 error 信息
 */
export function formatYaml(input: string, indent: number = 2): YamlResult {
  if (!input || !input.trim()) return { success: true, output: '' }
  try {
    const docs = yaml.loadAll(input)
    const safeIndent = indent === 4 ? 4 : 2
    const out = docs
      .map((doc) => {
        if (doc === null || doc === undefined) return ''
        return yaml.dump(doc, {
          indent: safeIndent,
          lineWidth: -1,
          noRefs: true,
        })
      })
      .filter((s) => s !== '')
      .join('---\n')
    return { success: true, output: out }
  } catch (e) {
    return { success: false, error: `YAML 语法错误：${normalizeError(e)}` }
  }
}

/**
 * 校验 YAML 字符串合法性
 *
 * @param input 输入 YAML 字符串
 * @returns 校验结果，失败时 error 包含行号提示信息
 */
export function validateYaml(input: string): YamlResult {
  if (!input || !input.trim()) return { success: true, output: '' }
  try {
    yaml.loadAll(input)
    return { success: true, output: '' }
  } catch (e) {
    return { success: false, error: `YAML 语法错误：${normalizeError(e)}` }
  }
}

/**
 * 将 YAML 转换为格式化 JSON 字符串
 *
 * 单文档输出对象，多文档（--- 分隔）输出为数组。
 *
 * @param input 输入 YAML 字符串
 * @returns JSON 字符串结果，失败时返回 error 信息
 */
export function yamlToJson(input: string): YamlResult {
  if (!input || !input.trim()) return { success: true, output: '' }
  try {
    const docs = yaml.loadAll(input)
    const json =
      docs.length > 1
        ? JSON.stringify(docs, null, 2)
        : JSON.stringify(docs[0] ?? null, null, 2)
    return { success: true, output: json }
  } catch (e) {
    return { success: false, error: `YAML 语法错误：${normalizeError(e)}` }
  }
}
