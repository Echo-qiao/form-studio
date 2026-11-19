<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getForm, saveForm, setFormStatus } from '@/api'
import FieldRenderer from '@/components/FieldRenderer.vue'
import {
  FIELD_TYPES,
  findField,
  locateArray,
  newField,
  type Field,
  type FieldType,
  type FormSchema,
} from '@/lib/schema'

const route = useRoute()
const id = route.params.id as string

const schema = ref<FormSchema>({ title: '', fields: [] })
const status = ref<'draft' | 'published' | 'closed'>('draft')
const shareId = ref('')
const version = ref(1)
const selectedId = ref('')
const saving = ref(false)
const busy = ref(false)
const message = ref('')
const error = ref('')

const draggingType = ref<FieldType | ''>('')
const draggingId = ref('')

const selected = computed(() => (selectedId.value ? findField(schema.value.fields, selectedId.value) : null))
const selectedIsGroup = computed(() => selected.value?.type === 'group')
const publicUrl = computed(() => (shareId.value ? `${location.origin}/f/${shareId.value}` : ''))

const optionsText = computed({
  get: () => (selected.value?.options ?? []).join('\n'),
  set: (value: string) => {
    if (!selected.value) return
    selected.value.options = value.split('\n').map((v) => v.trim()).filter(Boolean)
  },
})

async function load() {
  try {
    const data = await getForm(id)
    schema.value = data.schema
    status.value = data.status
    shareId.value = data.shareId
    version.value = data.version
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败'
  }
}

/** 添加字段：选中分组时加到分组内部，否则加到根层级 —— 这就是嵌套的唯一规则 */
function addField(type: FieldType) {
  const field = newField(type)
  if (selected.value?.type === 'group') {
    selected.value.children = selected.value.children ?? []
    selected.value.children.push(field)
  } else {
    schema.value.fields.push(field)
  }
  selectedId.value = field.id
}

function removeField(field: Field) {
  const arr = locateArray(schema.value.fields, field.id)
  if (!arr) return
  const index = arr.findIndex((f) => f.id === field.id)
  if (index >= 0) arr.splice(index, 1)
  if (selectedId.value === field.id) selectedId.value = ''
}

function move(field: Field, dir: -1 | 1) {
  const arr = locateArray(schema.value.fields, field.id)
  if (!arr) return
  const index = arr.findIndex((f) => f.id === field.id)
  const target = index + dir
  if (target < 0 || target >= arr.length) return
  const [item] = arr.splice(index, 1)
  arr.splice(target, 0, item)
}

function onPaletteDragStart(event: DragEvent, type: FieldType) {
  draggingType.value = type
  draggingId.value = ''
  event.dataTransfer?.setData('text/plain', type)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy'
}

function onFieldDragStart(event: DragEvent, field: Field) {
  draggingId.value = field.id
  draggingType.value = ''
  event.dataTransfer?.setData('text/plain', field.id)
}

function onCanvasDrop(event: DragEvent) {
  event.preventDefault()
  if (draggingType.value) addField(draggingType.value)
  draggingType.value = ''
}

/** 只支持同层排序：跨层移动会让 schema 结构变得难以理解，这里刻意不做 */
function onFieldDrop(event: DragEvent, target: Field) {
  event.preventDefault()
  event.stopPropagation()

  const sourceId = draggingId.value
  draggingId.value = ''
  if (!sourceId || sourceId === target.id) return

  const fromArr = locateArray(schema.value.fields, sourceId)
  const toArr = locateArray(schema.value.fields, target.id)
  if (!fromArr || !toArr || fromArr !== toArr) return

  const from = fromArr.findIndex((f) => f.id === sourceId)
  const to = toArr.findIndex((f) => f.id === target.id)
  const [item] = fromArr.splice(from, 1)
  toArr.splice(to, 0, item)
}

async function save() {
  if (saving.value) return
  saving.value = true
  message.value = ''
  error.value = ''
  try {
    const res = await saveForm(id, schema.value)
    version.value = res.version
    message.value = `已保存，当前版本 v${res.version}`
  } catch (e) {
    error.value = e instanceof Error ? e.message : '保存失败'
  } finally {
    saving.value = false
  }
}

async function changeStatus(next: 'draft' | 'published' | 'closed') {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    await setFormStatus(id, next)
    status.value = next
    message.value = next === 'published' ? '已发布，可以分享填写链接了' : `状态已改为 ${next}`
  } catch (e) {
    error.value = e instanceof Error ? e.message : '操作失败'
  } finally {
    busy.value = false
  }
}

function copyLink() {
  navigator.clipboard?.writeText(publicUrl.value)
  message.value = '链接已复制'
}

onMounted(load)
</script>

<template>
  <section class="designer-page">
    <div class="page-head">
      <div>
        <input v-model="schema.title" class="title-input" placeholder="表单标题" />
        <p class="subtitle">
          版本 v{{ version }} · 状态 {{ status }}
          <template v-if="status === 'published'"> · 公开链接：{{ publicUrl }}</template>
        </p>
      </div>
      <div class="head-actions">
        <button @click="copyLink" :disabled="status !== 'published'">复制链接</button>
        <button v-if="status !== 'published'" :disabled="busy" @click="changeStatus('published')">发布</button>
        <button v-else class="danger" :disabled="busy" @click="changeStatus('closed')">关闭收集</button>
        <button class="primary" :disabled="saving" @click="save">{{ saving ? '保存中…' : '保存' }}</button>
      </div>
    </div>

    <p v-if="message" class="alert ok">{{ message }}</p>
    <p v-if="error" class="alert error">{{ error }}</p>

    <div class="designer-grid">
      <!-- 左：组件库 -->
      <aside class="card palette">
        <p class="section-title">组件库</p>
        <div
          v-for="t in FIELD_TYPES"
          :key="t.type"
          class="palette-item"
          draggable="true"
          @dragstart="onPaletteDragStart($event, t.type)"
          @click="addField(t.type)"
        >
          {{ t.label }}
        </div>
        <p class="muted" style="margin-top: 10px">拖到中间，或直接点击添加</p>
      </aside>

      <!-- 中：画布 -->
      <div class="card canvas" @dragover.prevent @drop="onCanvasDrop">
        <p class="section-title">画布</p>

        <p v-if="schema.fields.length === 0" class="empty">把左侧组件拖进来，或点击组件</p>

        <div
          v-for="field in schema.fields"
          :key="field.id"
          class="canvas-item"
          draggable="true"
          @dragstart="onFieldDragStart($event, field)"
          @dragover.prevent
          @drop="onFieldDrop($event, field)"
        >
          <FieldRenderer
            :field="field"
            mode="design"
            :selected="selectedId === field.id"
            @select="(id) => (selectedId = id)"
          />
          <div class="item-tools">
            <button @click.stop="move(field, -1)">↑</button>
            <button @click.stop="move(field, 1)">↓</button>
            <button class="danger" @click.stop="removeField(field)">删除</button>
          </div>
        </div>
      </div>

      <!-- 右：属性 -->
      <aside class="card props">
        <p class="section-title">属性</p>

        <p v-if="!selected" class="muted">选中最外层组件后可以编辑属性。选中「分组」时，新加的字段会放进分组里。</p>

        <template v-else>
          <label class="field">
            标题
            <input v-model="selected.label" type="text" />
          </label>

          <label v-if="selected.type !== 'group'" class="field row">
            <input v-model="selected.required" type="checkbox" /> 必填
          </label>

          <label v-if="selected.type === 'text' || selected.type === 'textarea'" class="field">
            占位提示
            <input v-model="selected.placeholder" type="text" />
          </label>

          <label v-if="selected.type === 'text' || selected.type === 'textarea'" class="field">
            最大长度
            <input v-model.number="selected.maxLength" type="number" min="1" />
          </label>

          <label v-if="selected.type === 'radio' || selected.type === 'checkbox'" class="field">
            选项（一行一个）
            <textarea v-model="optionsText" rows="5" />
          </label>

          <p v-if="selectedIsGroup" class="muted">
            这是分组容器，选中它之后从左侧添加字段，就会放到分组内部（嵌套）。
          </p>

          <button class="danger block" @click="removeField(selected)">删除这个字段</button>
        </template>
      </aside>
    </div>
  </section>
</template>