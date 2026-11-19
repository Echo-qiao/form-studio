<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { createForm, listForms, type FormSummary } from '@/api'

const router = useRouter()
const forms = ref<FormSummary[]>([])
const loading = ref(false)
const error = ref('')
const title = ref('')
const creating = ref(false)

const STATUS_LABEL: Record<string, string> = { draft: '草稿', published: '已发布', closed: '已关闭' }

async function load() {
  loading.value = true
  error.value = ''
  try {
    forms.value = await listForms()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

async function create() {
  if (!title.value.trim() || creating.value) return
  creating.value = true
  try {
    const form = await createForm(title.value.trim())
    title.value = ''
    router.push(`/forms/${form.id}/design`)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '创建失败'
  } finally {
    creating.value = false
  }
}

function publicUrl(shareId: string) {
  return `${location.origin}/f/${shareId}`
}

onMounted(load)
</script>

<template>
  <section>
    <div class="page-head">
      <div>
        <h1>我的表单</h1>
        <p class="subtitle">从左侧拖入组件，保存后发布即可分享。</p>
      </div>
    </div>

    <p v-if="error" class="alert error">{{ error }}</p>

    <div class="card create-row">
      <input v-model="title" type="text" placeholder="新表单标题，例如：客户满意度调查" @keydown.enter="create" />
      <button class="primary" :disabled="creating" @click="create">{{ creating ? '创建中…' : '新建表单' }}</button>
    </div>

    <p v-if="loading" class="empty">加载中…</p>
    <p v-else-if="forms.length === 0" class="empty">还没有表单，先新建一个</p>

    <div v-for="f in forms" :key="f.id" class="card form-card">
      <div class="form-main">
        <div class="form-title">
          {{ f.title }}
          <span class="tag" :class="f.status">{{ STATUS_LABEL[f.status] }}</span>
          <span class="muted">v{{ f.version }}</span>
        </div>
        <div class="muted">
          {{ f.submissions }} 条提交 · 更新于 {{ new Date(f.updatedAt).toLocaleString('zh-CN', { hour12: false }) }}
        </div>
      </div>
      <div class="form-actions">
        <RouterLink :to="`/forms/${f.id}/design`"><button>编辑</button></RouterLink>
        <RouterLink :to="`/forms/${f.id}/records`"><button>数据（{{ f.submissions }}）</button></RouterLink>
        <a :href="publicUrl(f.shareId)" target="_blank" rel="noreferrer"><button :disabled="f.status !== 'published'">填写页</button></a>
      </div>
    </div>
  </section>
</template>