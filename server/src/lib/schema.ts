/**
 * 表单 schema 的类型定义与校验。
 * 前后端共用同一套规则描述 —— 这是这个项目的核心设计：
 * 校验逻辑不写在页面里，而是由 schema 推导出来。
 */
export type FieldType = 'text' | 'textarea' | 'radio' | 'checkbox' | 'date' | 'number' | 'group'

export type Field = {
  id: string
  type: FieldType
  label: string
  required?: boolean
  placeholder?: string
  options?: string[]
  maxLength?: number
  children?: Field[]
}

export type FormSchema = {
  title: string
  fields: Field[]
}

export const FIELD_TYPES: { type: FieldType; label: string }[] = [
  { type: 'text', label: '单行文本' },
  { type: 'textarea', label: '多行文本' },
  { type: 'radio', label: '单选' },
  { type: 'checkbox', label: '多选' },
  { type: 'date', label: '日期' },
  { type: 'number', label: '数字' },
  { type: 'group', label: '分组' },
]

/** 把嵌套结构拍平，便于逐字段校验 */
export function flattenFields(fields: Field[]): Field[] {
  const out: Field[] = []
  for (const f of fields) {
    out.push(f)
    if (f.children?.length) out.push(...flattenFields(f.children))
  }
  return out
}

export type FieldErrors = Record<string, string>

/** 服务端校验：返回 { 字段id: 错误信息 }，空对象表示通过 */
export function validateSubmission(schema: FormSchema, data: Record<string, unknown>): FieldErrors {
  const errors: FieldErrors = {}

  for (const field of flattenFields(schema.fields)) {
    if (field.type === 'group') continue

    const value = data[field.id]
    const isEmpty =
      value === undefined ||
      value === null ||
      value === '' ||
      (Array.isArray(value) && value.length === 0)

    if (field.required && isEmpty) {
      errors[field.id] = `${field.label} 不能为空`
      continue
    }
    if (isEmpty) continue

    switch (field.type) {
      case 'number':
        if (typeof value !== 'number' && Number.isNaN(Number(value))) {
          errors[field.id] = `${field.label} 必须是数字`
        }
        break
      case 'date':
        if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
          errors[field.id] = `${field.label} 日期格式不正确`
        }
        break
      case 'radio':
        if (typeof value !== 'string' || !field.options?.includes(value)) {
          errors[field.id] = `${field.label} 的选项不合法`
        }
        break
      case 'checkbox':
        if (!Array.isArray(value) || value.some((v) => !field.options?.includes(String(v)))) {
          errors[field.id] = `${field.label} 的选项不合法`
        }
        break
      default:
        if (typeof value !== 'string') {
          errors[field.id] = `${field.label} 必须是文本`
        } else if (field.maxLength && value.length > field.maxLength) {
          errors[field.id] = `${field.label} 最多 ${field.maxLength} 个字符`
        }
    }
  }

  return errors
}

/** 生成分享短码 */
export function makeShareId(length = 8): string {
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789'
  let out = ''
  for (let i = 0; i < length; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return out
}