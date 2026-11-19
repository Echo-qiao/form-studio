<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { listSubmissions, type SubmissionRow } from '@/api'
import { flattenFields, type Field, type FormSchema } from '@/lib/schema'

const route = useRoute()
const id = route.params.id as string

const rows = ref<SubmissionRow[]>([])
const currentVersion = ref(1)
const loading = ref(true)
const error = ref('')

function labelRows(schema: FormSchema, data: Record<string, unknown>, parentLabel = ''): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = []
  for (const field of schema.fields) {
    if (field.type === 'group') {
      out.push(...labelRows({ title: '', fields: field.children ?? [] }, data, field.label + ' / '))
      continue
    }
    const value = data[field.id]
    if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) continue
    out.push({
      label: parentLabel + field.label,
      value: Array.isArray(value) ? value.join('、') : String(value),
    })
  }
  return out
}

onMounted(async () => {
  try {
    const res = await listSubmissions(id)
    rows.value = res.list
    currentVersion.value = res.currentVersion
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <section>
    <div class="page-head">
      <div>
        <h1>提交记录</h1>
        <p class="subtitle">
          每条记录都带着提交时的表单版本 —— 表单改版后，老数据仍用当时的 schema 渲染。
        </p>
      </div>
      <RouterLink to="/forms"><button>返回列表</button></RouterLink>
    </div>

    <p v-if="error" class="alert error">{{ error }}</p>
    <p v-if="loading" class="empty">加载中…</p>
    <p v-else-if="rows.length === 0" class="empty">还没有人提交</p>

    <div v-for="row in rows" :key="row.id" class="card">
      <div class="record-head">
        <span class="muted">{{ new Date(row.createdAt).toLocaleString('zh-CN', { hour12: false }) }}</span>
        <span class="tag" :class="row.formVersion === currentVersion ? 'ok' : 'warn'">
          v{{ row.formVersion }}<template v-if="row.formVersion !== currentVersion">（旧版本）</template>
        </span>
      </div>
      <div class="kv" v-for="item in labelRows(row.schema, row.data)" :key="item.label">
        <span>{{ item.label }}</span>
        <span>{{ item.value }}</span>
      </div>
    </div>
  </section>
</template>