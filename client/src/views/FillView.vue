<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getPublicForm, submitForm } from '@/api'
import FieldRenderer from '@/components/FieldRenderer.vue'
import { validate, type FieldErrors, type FormSchema } from '@/lib/schema'

const route = useRoute()
const shareId = route.params.shareId as string

const title = ref('')
const schema = ref<FormSchema>({ title: '', fields: [] })
const data = ref<Record<string, unknown>>({})
const errors = ref<FieldErrors>({})
const loading = ref(true)
const submitting = ref(false)
const error = ref('')
const done = ref(false)

onMounted(async () => {
  try {
    const form = await getPublicForm(shareId)
    title.value = form.title
    schema.value = form.schema
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
})

async function submit() {
  if (submitting.value) return
  error.value = ''

  // 前端先按同一套规则校验一次，减少无意义的请求
  const localErrors = validate(schema.value, data.value)
  errors.value = localErrors
  if (Object.keys(localErrors).length > 0) return

  submitting.value = true
  try {
    await submitForm(shareId, data.value)
    done.value = true
  } catch (e) {
    error.value = e instanceof Error ? e.message : '提交失败'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="fill-page">
    <div class="fill-card">
      <p v-if="loading" class="empty">加载中…</p>

      <template v-else-if="done">
        <h1>提交成功</h1>
        <p class="subtitle">感谢填写，你的回答已记录。</p>
      </template>

      <template v-else-if="error && !schema.fields.length">
        <h1>无法打开</h1>
        <p class="alert error">{{ error }}</p>
      </template>

      <template v-else>
        <h1>{{ title }}</h1>
        <p class="subtitle">带 * 的为必填项</p>

        <p v-if="error" class="alert error">{{ error }}</p>

        <FieldRenderer
          v-for="field in schema.fields"
          :key="field.id"
          :field="field"
          mode="fill"
          :values="data"
          :errors="errors"
          @change="(id, value) => (data[id] = value)"
        />

        <button class="primary block" :disabled="submitting" @click="submit">
          {{ submitting ? '提交中…' : '提交' }}
        </button>
      </template>
    </div>
  </div>
</template>