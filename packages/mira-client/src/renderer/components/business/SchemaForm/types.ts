import type { z } from 'zod'

/**
 * 支持的字段类型
 * - 文本类：text / textarea / password / email / number
 * - 选择类：select / radio-group
 * - 开关类：switch / checkbox(单布尔) / checkbox-group(多选 -> string[])
 * - 其他：date / slider
 */
export type FieldType =
  | 'text'
  | 'textarea'
  | 'password'
  | 'email'
  | 'number'
  | 'select'
  | 'radio-group'
  | 'switch'
  | 'checkbox'
  | 'checkbox-group'
  | 'date'
  | 'slider'

/** 下拉/单选/多选项 */
export interface SelectOption {
  label: string
  value: string | number
  disabled?: boolean
}

/** 单个字段的声明式描述 */
export interface SchemaField {
  /** 字段名，须与 zod schema 的 key 一致 */
  name: string
  /** 标签文本 */
  label: string
  /** 字段类型 */
  type: FieldType
  /** 字段描述/帮助文本 */
  description?: string
  /** 占位符（文本类字段） */
  placeholder?: string
  /** select / radio-group / checkbox-group 的可选项 */
  options?: SelectOption[]
  /** 默认值 */
  defaultValue?: unknown
  /** 禁用 */
  disabled?: boolean
  /** 是否必填（仅用于 label 上展示 `*`，实际校验由 zod 决定） */
  required?: boolean
  /** slider 专用：最小值 */
  min?: number
  /** slider 专用：最大值 */
  max?: number
  /** slider 专用：步长 */
  step?: number
  /** 布局：在 grid 布局下占几列（1 或 2），默认 1 */
  colSpan?: 1 | 2
}

/** SchemaForm Props */
export interface SchemaFormProps<T = Record<string, unknown>> {
  /** zod schema，是数据类型与校验规则的单一真源 */
  schema: z.ZodType<T>
  /** 字段声明数组 */
  fields: SchemaField[]
  /** 初始值（用于回填/编辑） */
  initialValues?: Partial<T>
  /** 表单标题 */
  title?: string
  /** 表单描述 */
  formDescription?: string
  /** 提交按钮文案 */
  submitText?: string
  /** 取消按钮文案 */
  cancelText?: string
  /** 布局：grid 双列 / single 单列 */
  layout?: 'single' | 'grid'
  /** 提交中（禁用提交按钮） */
  submitting?: boolean
}

/** SchemaForm Emits */
export interface SchemaFormEmits<T = Record<string, unknown>> {
  (e: 'submit', values: T): void
  (e: 'cancel'): void
  /** 校验失败时触发，返回 {字段名: 错误信息} */
  (e: 'invalid', errors: Record<string, string>): void
}
