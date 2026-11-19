<script setup lang="ts">
import type { Field, FieldErrors, FieldType } from '@/lib/schema'

const props = defineProps<{
  field: Field
  mode: 'design' | 'fill'
  /** 整个表单的值，按 field.id 取值；分组只是布局，不产生自己的值 */
  values?: Record<string, unknown>
  errors?: FieldErrors
  selected?: boolean
}>()

const emit = defineEmits<{
  select: [id: string]
  change: [id: string, value: unknown]
}>()

const TYPE_HINT: Record<FieldType, string> = {
  text: '单行文本',
  textarea: '多行文本',
  radio: '单选',
  checkbox: '多选',
  date: '日期',
  number: '数字',
  group: '分组',
}

function onClick() {
  if (props.mode === 'design') emit('select', props.field.id)
}

function current() {
  return props.values ? props.values[props.field.id] : undefined
}

function textValue() {
  const v = current()
  return v === undefined || v === null ? '' : String(v)
}

function listValue(): string[] {
  const v = current()
  return Array.isArray(v) ? (v as string[]) : []
}

function toggleOption(option: string, checked: boolean) {
  const next = checked ? [...listValue(), option] : listValue().filter((v) => v !== option)
  emit('change', props.field.id, next)
}
</script>

<template>
  <!-- 分组：纯容器，子字段的值仍然按各自 id 存在顶层 -->
  <div v-if="field.type === 'group'" class="group-box" :class="{ selected }" @click.stop="onClick">
    <div class="group-title">
      {{ field.label }}
      <span class="muted">（分组 · {{ field.children?.length ?? 0 }} 个字段）</span>
    </div>
    <p v-if="!field.children?.length" class="empty-tip">
      空分组：选中它之后从左侧添加字段，会放进分组内部
    </p>
    <FieldRenderer
      v-for="child in field.children ?? []"
      :key="child.id"
      :field="child"
      :mode="mode"
      :values="values"
      :errors="errors"
      @change="(id, value) => $emit('change', id, value)"
      @select="(id) => $emit('select', id)"
    />
  </div>

  <!-- 普通字段 -->
  <div v-else class="field-row" :class="{ selected, invalid: !!errors?.[field.id] }" @click.stop="onClick">
    <label class="field-label">
      {{ field.label }}
      <span v-if="field.required" class="required">*</span>
      <span class="type-hint">{{ TYPE_HINT[field.type] }}</span>
    </label>

    <template v-if="mode === 'design'">
      <input v-if="field.type === 'text'" disabled :placeholder="field.placeholder ?? '单行文本'" />
      <textarea v-else-if="field.type === 'textarea'" disabled rows="2" :placeholder="field.placeholder ?? '多行文本'" />
      <div v-else-if="field.type === 'radio' || field.type === 'checkbox'" class="options">
        <span v-for="opt in field.options ?? []" :key="opt" class="opt">
          <input :type="field.type === 'radio' ? 'radio' : 'checkbox'" disabled /> {{ opt }}
        </span>
      </div>
      <input v-else-if="field.type === 'date'" type="date" disabled />
      <input v-else-if="field.type === 'number'" type="number" disabled placeholder="数字" />
    </template>

    <template v-else>
      <input
        v-if="field.type === 'text'"
        :value="textValue()"
        :placeholder="field.placeholder"
        @input="emit('change', field.id, ($event.target as HTMLInputElement).value)"
      />
      <textarea
        v-else-if="field.type === 'textarea'"
        :value="textValue()"
        :placeholder="field.placeholder"
        rows="4"
        @input="emit('change', field.id, ($event.target as HTMLTextAreaElement).value)"
      />
      <div v-else-if="field.type === 'radio'" class="options">
        <label v-for="opt in field.options ?? []" :key="opt" class="opt">
          <input
            type="radio"
            :name="field.id"
            :checked="textValue() === opt"
            @change="emit('change', field.id, opt)"
          />
          {{ opt }}
        </label>
      </div>
      <div v-else-if="field.type === 'checkbox'" class="options">
        <label v-for="opt in field.options ?? []" :key="opt" class="opt">
          <input
            type="checkbox"
            :checked="listValue().includes(opt)"
            @change="toggleOption(opt, ($event.target as HTMLInputElement).checked)"
          />
          {{ opt }}
        </label>
      </div>
      <input
        v-else-if="field.type === 'date'"
        type="date"
        :value="textValue()"
        @input="emit('change', field.id, ($event.target as HTMLInputElement).value)"
      />
      <input
        v-else-if="field.type === 'number'"
        type="number"
        :value="textValue()"
        @input="emit('change', field.id, Number(($event.target as HTMLInputElement).value))"
      />
    </template>

    <p v-if="errors?.[field.id]" class="field-error">{{ errors[field.id] }}</p>
  </div>
</template>