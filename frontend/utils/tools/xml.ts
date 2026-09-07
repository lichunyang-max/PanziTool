/**
 * xml.ts - XML 格式化/压缩/校验纯函数
 *
 * 使用纯 JS 递归解析器（不依赖 DOMParser / DOM API），可在 SSR 环境运行。
 * 忠实移植自 panziui/tools/xml-formatter.html 的内联脚本逻辑：
 * - 支持元素 / 属性 / 文本 / CDATA / 注释 / 处理指令（含 XML 声明）/ DOCTYPE
 * - formatXml：按缩进美化输出（2/4 空格），短文本内联、长文本与子元素折行
 * - minifyXml：先校验再正则压缩多余空白
 * - validateXml：仅校验语法，错误信息携带行列位置
 *
 * 文本与属性值保留原始字符（不解码实体），对合法 XML 可正确往返。
 */

/** 格式化 / 压缩 / 校验操作结果 */
export interface XmlResult {
  success: boolean
  output?: string
  error?: string
}

/** XML 名字字符（含命名空间前缀常用的 : 与 - . 等） */
const NAME_CHAR = /[A-Za-z0-9_\-\.:]/
const NAME_START = /[A-Za-z_:]/

/** 语法错误（携带 1-indexed 行列位置） */
class XmlSyntaxError extends Error {
  line: number
  column: number
  constructor(message: string, line: number, column: number) {
    super(message)
    this.name = 'XmlSyntaxError'
    this.line = line
    this.column = column
  }
}

interface XmlAttribute {
  name: string
  value: string
}

type XmlNodeType = 'element' | 'text' | 'cdata' | 'comment' | 'pi' | 'doctype'

interface XmlNode {
  type: XmlNodeType
  name?: string
  attributes?: XmlAttribute[]
  children?: XmlNode[]
  selfClosing?: boolean
  content?: string
  target?: string
  data?: string
}

/** 纯 JS 递归下降 XML 解析器，解析过程中维护行列位置 */
class XmlParser {
  private s: string
  private pos = 0
  private line = 1
  private col = 1

  constructor(input: string) {
    this.s = input
  }

  private peek(): string {
    return this.s[this.pos]
  }

  private startsWith(str: string): boolean {
    return this.s.startsWith(str, this.pos)
  }

  private advance(n: number = 1): void {
    for (let k = 0; k < n; k++) {
      const ch = this.s[this.pos]
      this.pos++
      if (ch === '\n') {
        this.line++
        this.col = 1
      } else {
        this.col++
      }
    }
  }

  private error(message: string): never {
    throw new XmlSyntaxError(message, this.line, this.col)
  }

  private isNameChar(ch: string): boolean {
    return NAME_CHAR.test(ch)
  }

  private skipSpaces(): void {
    while (this.pos < this.s.length && /\s/.test(this.s[this.pos])) {
      this.advance()
    }
  }

  parseDocument(): XmlNode[] {
    const nodes: XmlNode[] = []
    const len = this.s.length
    while (this.pos < len) {
      const ch = this.peek()
      if (this.startsWith('<?')) nodes.push(this.parsePI())
      else if (this.startsWith('<!--')) nodes.push(this.parseComment())
      else if (this.startsWith('<![CDATA[')) nodes.push(this.parseCdata())
      else if (this.startsWith('<!')) nodes.push(this.parseDoctype())
      else if (ch === '<') nodes.push(this.parseElement())
      else nodes.push(this.parseText())
    }
    return nodes
  }

  private parseText(): XmlNode {
    const start = this.pos
    const len = this.s.length
    while (this.pos < len && this.peek() !== '<') this.advance()
    return { type: 'text', content: this.s.slice(start, this.pos) }
  }

  private parsePI(): XmlNode {
    this.advance(2) // <?
    const len = this.s.length
    const nameStart = this.pos
    while (this.pos < len && this.isNameChar(this.peek())) this.advance()
    const target = this.s.slice(nameStart, this.pos)
    if (!target) this.error('处理指令缺少目标名')
    const dataStart = this.pos
    while (this.pos < len && !this.startsWith('?>')) this.advance()
    if (this.pos >= len) this.error('处理指令未闭合，缺少 ?>')
    const data = this.s.slice(dataStart, this.pos).trim()
    this.advance(2) // ?>
    return { type: 'pi', target, data }
  }

  private parseComment(): XmlNode {
    this.advance(4) // <!--
    const start = this.pos
    const len = this.s.length
    while (this.pos < len && !this.startsWith('-->')) this.advance()
    if (this.pos >= len) this.error('注释未闭合，缺少 -->')
    const content = this.s.slice(start, this.pos)
    this.advance(3) // -->
    return { type: 'comment', content }
  }

  private parseCdata(): XmlNode {
    this.advance(9) // <![CDATA[
    const start = this.pos
    const len = this.s.length
    while (this.pos < len && !this.startsWith(']]>')) this.advance()
    if (this.pos >= len) this.error('CDATA 段未闭合，缺少 ]]>')
    const content = this.s.slice(start, this.pos)
    this.advance(3) // ]]>
    return { type: 'cdata', content }
  }

  private parseDoctype(): XmlNode {
    const start = this.pos
    this.advance(2) // <!
    const len = this.s.length
    let depth = 0
    let closed = false
    while (this.pos < len) {
      const ch = this.peek()
      if (ch === '[') {
        depth++
        this.advance()
      } else if (ch === ']') {
        depth--
        this.advance()
      } else if (ch === '>' && depth === 0) {
        this.advance()
        closed = true
        break
      } else {
        this.advance()
      }
    }
    if (!closed) this.error('DOCTYPE 声明未闭合，缺少 >')
    return { type: 'doctype', content: this.s.slice(start, this.pos) }
  }

  private parseAttribute(): XmlAttribute {
    const len = this.s.length
    const nameStart = this.pos
    while (this.pos < len && this.isNameChar(this.peek())) this.advance()
    const name = this.s.slice(nameStart, this.pos)
    if (!name) this.error('属性名缺失')
    if (!NAME_START.test(name.charAt(0)))
      this.error(`属性名 "${name}" 首字符非法`)
    this.skipSpaces()
    if (this.peek() !== '=') this.error(`属性 "${name}" 缺少 "=" 与取值`)
    this.advance(1) // =
    this.skipSpaces()
    const quote = this.peek()
    if (quote !== '"' && quote !== "'") {
      this.error(`属性 "${name}" 的值必须用引号包裹`)
    }
    this.advance(1) // 开引号
    const valStart = this.pos
    while (this.pos < len && this.peek() !== quote) this.advance()
    if (this.pos >= len) this.error(`属性 "${name}" 的值未闭合`)
    const value = this.s.slice(valStart, this.pos)
    this.advance(1) // 闭引号
    return { name, value }
  }

  private parseElement(): XmlNode {
    this.advance(1) // <
    const len = this.s.length
    const nameStart = this.pos
    while (this.pos < len && this.isNameChar(this.peek())) this.advance()
    const name = this.s.slice(nameStart, this.pos)
    if (!name) this.error('标签名缺失')
    if (!NAME_START.test(name.charAt(0)))
      this.error(`标签名 "${name}" 首字符非法`)
    const attributes: XmlAttribute[] = []
    let selfClosing = false
    for (;;) {
      this.skipSpaces()
      if (this.pos >= len) this.error(`标签 <${name}> 未闭合`)
      if (this.startsWith('/>')) {
        selfClosing = true
        this.advance(2)
        break
      }
      const ch = this.peek()
      if (ch === '>') {
        selfClosing = false
        this.advance(1)
        break
      }
      attributes.push(this.parseAttribute())
    }
    if (selfClosing) {
      return { type: 'element', name, attributes, children: [], selfClosing: true }
    }
    const children: XmlNode[] = []
    for (;;) {
      if (this.pos >= len) this.error(`标签 <${name}> 未闭合，缺少 </${name}>`)
      if (this.startsWith('</')) {
        const closeLine = this.line
        const closeCol = this.col
        this.advance(2) // </
        const closeStart = this.pos
        while (this.pos < len && this.isNameChar(this.peek())) this.advance()
        const closeName = this.s.slice(closeStart, this.pos)
        this.skipSpaces()
        if (this.peek() !== '>') this.error('结束标签格式错误，缺少 >')
        this.advance(1) // >
        if (closeName !== name) {
          throw new XmlSyntaxError(
            `开始标签 <${name}> 与结束标签 </${closeName}> 不匹配`,
            closeLine,
            closeCol,
          )
        }
        break
      }
      if (this.startsWith('<!--')) children.push(this.parseComment())
      else if (this.startsWith('<![CDATA[')) children.push(this.parseCdata())
      else if (this.startsWith('<?')) children.push(this.parsePI())
      else if (this.startsWith('<!')) children.push(this.parseDoctype())
      else if (this.peek() === '<') children.push(this.parseElement())
      else children.push(this.parseText())
    }
    return { type: 'element', name, attributes, children, selfClosing: false }
  }
}

/** 递归序列化节点为格式化文本（移植自 HTML 的 formatNode） */
function formatNode(
  node: XmlNode,
  indent: number,
  indentUnit: string,
  lines: string[],
): void {
  const pad = indentUnit.repeat(indent)

  if (node.type === 'text') {
    const t = (node.content ?? '').trim()
    if (t) lines.push(pad + t)
    return
  }
  if (node.type === 'cdata') {
    lines.push(pad + '<![CDATA[' + (node.content ?? '') + ']]>')
    return
  }
  if (node.type === 'comment') {
    lines.push(pad + '<!--' + (node.content ?? '') + '-->')
    return
  }
  if (node.type === 'pi') {
    // 处理指令（含 XML 声明）顶格输出，与 HTML 行为一致
    lines.push('<?' + node.target + ' ' + (node.data ?? '') + '?>')
    return
  }
  if (node.type === 'doctype') {
    lines.push(pad + (node.content ?? ''))
    return
  }
  if (node.type !== 'element') return

  const name = node.name ?? ''
  let tag = '<' + name
  for (const attr of node.attributes ?? []) {
    tag += ' ' + attr.name + '="' + attr.value + '"'
  }
  const children = node.children ?? []
  const onlyText =
    children.length > 0 &&
    children.every((c) => c.type === 'text' || c.type === 'cdata')
  let textContent = ''
  if (onlyText) {
    textContent = children.map((c) => c.content ?? '').join('')
  }

  if (children.length === 0) {
    lines.push(pad + tag + '/>')
  } else if (onlyText && textContent.trim().length <= 80) {
    const hasCdata = children.some((c) => c.type === 'cdata')
    if (hasCdata) {
      lines.push(pad + tag + '>')
      for (const c of children) {
        if (c.type === 'cdata') {
          lines.push(pad + indentUnit + '<![CDATA[' + (c.content ?? '') + ']]>')
        } else {
          const t = (c.content ?? '').trim()
          if (t) lines.push(pad + indentUnit + t)
        }
      }
      lines.push(pad + '</' + name + '>')
    } else {
      lines.push(pad + tag + '>' + textContent.trim() + '</' + name + '>')
    }
  } else {
    lines.push(pad + tag + '>')
    for (const c of children) {
      formatNode(c, indent + 1, indentUnit, lines)
    }
    lines.push(pad + '</' + name + '>')
  }
}

/** 将解析异常转为带行列位置的中文错误信息 */
function formatXmlError(e: unknown): string {
  if (e instanceof XmlSyntaxError) {
    return `XML 语法错误：${e.message}（第 ${e.line} 行第 ${e.column} 列）`
  }
  const msg = e instanceof Error ? e.message : String(e)
  return `XML 语法错误：${msg}`
}

/**
 * 格式化 XML 字符串（美化输出）
 *
 * @param input 输入 XML 字符串
 * @param indent 缩进空格数（2 或 4），默认 2；非 4 时回退为 2
 * @returns 格式化结果，失败时返回 error 信息
 */
export function formatXml(input: string, indent: number = 2): XmlResult {
  if (!input || !input.trim()) return { success: true, output: '' }
  try {
    const parser = new XmlParser(input)
    const doc = parser.parseDocument()
    const safeIndent = indent === 4 ? 4 : 2
    const indentUnit = ' '.repeat(safeIndent)
    const lines: string[] = []
    for (const node of doc) {
      formatNode(node, 0, indentUnit, lines)
    }
    return { success: true, output: lines.join('\n') }
  } catch (e) {
    return { success: false, error: formatXmlError(e) }
  }
}

/**
 * 压缩 XML 字符串（移除标签间多余空白）
 *
 * 先解析校验确保结构合法，再用正则压缩（移植自 HTML 的 minifyXml）。
 *
 * @param input 输入 XML 字符串
 * @returns 压缩结果，失败时返回 error 信息
 */
export function minifyXml(input: string): XmlResult {
  if (!input || !input.trim()) return { success: true, output: '' }
  try {
    const parser = new XmlParser(input)
    parser.parseDocument()
    const output = input
      .replace(/>\s+</g, '><')
      .replace(/\r?\n/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
    return { success: true, output }
  } catch (e) {
    return { success: false, error: formatXmlError(e) }
  }
}

/**
 * 校验 XML 字符串合法性
 *
 * @param input 输入 XML 字符串
 * @returns 校验结果，失败时 error 包含行列位置信息
 */
export function validateXml(input: string): XmlResult {
  if (!input || !input.trim()) return { success: true, output: '' }
  try {
    const parser = new XmlParser(input)
    parser.parseDocument()
    return { success: true, output: '' }
  } catch (e) {
    return { success: false, error: formatXmlError(e) }
  }
}
