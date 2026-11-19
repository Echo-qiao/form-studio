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

export type FormSchema = { title: string; fields: Field[] }

export const FIELD_TYPES: { type: FieldType; label: string }[] = [
  { type: 'text', label: '单行文本' },
  { type: 'textarea', label: '多行文本' },
  { type: 'radio', label: '单选' },
  { type: 'checkbox', label: '多选' },
  { type: 'date', label: '日期' },
  { type: 'number', label: '数字' },
  { type: 'group', label: '分组' },
]

let seq = 0
export function newField(type: FieldType): Field {
  seq += 1
  const id = `f_${Date.now().toString(36)}_${seq}`
  const base: Field = { id, type, label: FIELD_TYPES.find((t) => t.type === type)?.label ?? '字段' }
  if (type === 'radio' || type === 'checkbox') base.options = ['选项一', '选项二']
  if (type === 'group') base.children = []
  if (type === 'textarea') base.maxLength = 500
  return base
}

export function flattenFields(fields: Field[]): Field[] {
  const out: Field[] = []
  for (const f of fields) {
    out.push(f)
    if (f.children?.length) out.push(...flattenFields(f.children))
  }
  return out
}

/** 找到某个字段所在的数组（用于删除 / 排序） */
export function locateArray(fields: Field[], id: string): Field[] | null {
  for (const f of fields) {
    if (f.id === id) return fields
    if (f.children) {
      const found = locateArray(f.children, id)
      if (found) return found
    }
  }
  return null
}

export function findField(fields: Field[], id: string): Field | null {
  for (const f of fields) {
    if (f.id === id) return f
    if (f.children) {
      const found = findField(f.children, id)
      if (found) return found
    }
  }
  return null
}

export type FieldErrors = Record<string, string>

/** 与后端同一套规则：必填、类型、长度 */
export function validate(schema: FormSchema, data: Record<string, unknown>): FieldErrors {
  const errors: FieldErrors = {}

  for (const field of flattenFields(schema.fields)) {
    if (field.type === 'group') continue

    const value = data[field.id]
    const empty =
      value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)

    if (field.required && empty) {
      errors[field.id] = `${field.label} 不能为空`
      continue
    }
    if (empty) continue

    if (field.type === 'number' && Number.isNaN(Number(value))) errors[field.id] = '必须是数字'
    if (field.type === 'radio' && !field.options?.includes(String(value))) errors[field.id] = '选项不合法'
    if (field.type === 'checkbox' && !Array.isArray(value)) errors[field.id] = '选项不合法'
    if (
      (field.type === 'text' || field.type === 'textarea') &&
      field.maxLength &&
      String(value).length > field.maxLength
    ) {
      errors[field.id] = `最多 ${field.maxLength} 个字符`
    }
  }

  return errors
}