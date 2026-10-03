/**
 * textWorkflow.ts - 文本处理工作流纯函数
 *
 * 一组可串联的行/文本处理操作，按步骤顺序执行。
 * 步骤定义（id + 操作类型 + 参数）可序列化到 localStorage。
 */
import { convertCase, type CaseMode } from './textCore'

export type WorkflowOpType =
  | 'case'
  | 'replace'
  | 'regexReplace'
  | 'addPrefix'
  | 'addSuffix'
  | 'removeEmptyLines'
  | 'trimLines'
  | 'addLineNumbers'
  | 'dedupeLines'
  | 'reverseLines'
  | 'sortLines'
  | 'extractLines'

export interface WorkflowOpMeta {
  type: WorkflowOpType
  label: string
  /** 是否需要参数输入 */
  hasParam: boolean
  paramLabel?: string
  paramPlaceholder?: string
  paramType?: 'text' | 'caseMode' | 'sortMode'
}

export const WORKFLOW_OPS: WorkflowOpMeta[] = [
  { type: 'case', label: '大小写转换', hasParam: true, paramLabel: '模式', paramType: 'caseMode' },
  { type: 'replace', label: '文本替换', hasParam: true, paramLabel: '查找=>替换', paramPlaceholder: '旧词=>新词' },
  { type: 'regexReplace', label: '正则替换', hasParam: true, paramLabel: '正则=>替换', paramPlaceholder: '\\d+=>#' },
  { type: 'addPrefix', label: '增加前缀', hasParam: true, paramLabel: '前缀', paramPlaceholder: '- ' },
  { type: 'addSuffix', label: '增加后缀', hasParam: true, paramLabel: '后缀', paramPlaceholder: ';' },
  { type: 'removeEmptyLines', label: '删除空行', hasParam: false },
  { type: 'trimLines', label: '删除首尾空格', hasParam: false },
  { type: 'addLineNumbers', label: '增加行号', hasParam: false },
  { type: 'dedupeLines', label: '项目去重', hasParam: false },
  { type: 'reverseLines', label: '翻转内容（行）', hasParam: false },
  { type: 'sortLines', label: '行排序', hasParam: true, paramLabel: '顺序', paramType: 'sortMode' },
  { type: 'extractLines', label: '提取匹配行', hasParam: true, paramLabel: '正则', paramPlaceholder: '^ERROR' },
]

export interface WorkflowStep {
  id: string
  op: WorkflowOpType
  param?: string
  enabled?: boolean
}

export function getWorkflowOpMeta(type: WorkflowOpType): WorkflowOpMeta {
  return WORKFLOW_OPS.find((o) => o.type === type) || WORKFLOW_OPS[0]!
}

let idSeq = 0
export function createWorkflowStep(op: WorkflowOpType, param = ''): WorkflowStep {
  idSeq += 1
  return { id: `wf-${Date.now()}-${idSeq}`, op, param, enabled: true }
}

/** 执行单步；正则非法时抛错（由调用方捕获展示） */
function applyStep(text: string, step: WorkflowStep): string {
  const param = step.param ?? ''
  const lines = () => text.split(/\r?\n/)
  const join = (arr: string[]) => arr.join('\n')

  switch (step.op) {
    case 'case':
      return convertCase(text, (param as CaseMode) || 'upper')
    case 'replace': {
      const [find, replacement = ''] = splitParam(param)
      if (!find) return text
      return text.split(find).join(replacement)
    }
    case 'regexReplace': {
      const [pattern, replacement = ''] = splitParam(param)
      if (!pattern) return text
      return text.replace(new RegExp(pattern, 'g'), replacement)
    }
    case 'addPrefix':
      return join(lines().map((l) => param + l))
    case 'addSuffix':
      return join(lines().map((l) => l + param))
    case 'removeEmptyLines':
      return join(lines().filter((l) => l.trim() !== ''))
    case 'trimLines':
      return join(lines().map((l) => l.trim()))
    case 'addLineNumbers': {
      let n = 1
      return join(lines().map((l) => (l.trim() === '' ? l : `${n++}. ${l}`)))
    }
    case 'dedupeLines':
      return join([...new Set(lines())])
    case 'reverseLines':
      return join(lines().reverse())
    case 'sortLines':
      return join(lines().sort((x, y) => param === 'desc' ? y.localeCompare(x) : x.localeCompare(y)))
    case 'extractLines': {
      if (!param) return text
      const re = new RegExp(param)
      return join(lines().filter((l) => re.test(l)))
    }
    default:
      return text
  }
}

/** 参数以 => 分隔为两段（替换串可包含空串） */
function splitParam(param: string): [string, string] {
  const idx = param.indexOf('=>')
  if (idx === -1) return [param, '']
  return [param.slice(0, idx), param.slice(idx + 2)]
}

export interface WorkflowResult {
  output: string
  executed: number
  error?: { stepIndex: number; message: string }
}

export function runWorkflow(text: string, steps: WorkflowStep[]): WorkflowResult {
  let output = text
  let executed = 0
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]!
    if (step.enabled === false) continue
    try {
      output = applyStep(output, step)
      executed += 1
    } catch (err) {
      return {
        output,
        executed,
        error: {
          stepIndex: i,
          message: `第 ${i + 1} 步「${getWorkflowOpMeta(step.op).label}」执行失败：${err instanceof Error ? err.message : String(err)}`,
        },
      }
    }
  }
  return { output, executed }
}

export const WORKFLOW_MAX_STEPS = 20
