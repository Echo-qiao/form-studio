<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const user = useUserStore()

const mode = ref<'login' | 'register'>('login')
const email = ref('demo@form.com')
const password = ref('123456')
const name = ref('')
const error = ref('')
const busy = ref(false)

async function submit() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    if (mode.value === 'login') await user.login(email.value.trim(), password.value)
    else await user.register(email.value.trim(), password.value, name.value.trim())
    router.push('/forms')
  } catch (e) {
    error.value = e instanceof Error ? e.message : '操作失败'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="auth">
    <div class="auth-left">
      <h2>表单设计器</h2>
      <p>拖拽组件搭表单 → 生成分享链接 → 收集数据。<br />表单是数据，不是代码。</p>
    </div>
    <div class="auth-right">
      <div class="auth-card">
        <div class="tabs">
          <button :class="{ active: mode === 'login' }" @click="mode = 'login'">登录</button>
          <button :class="{ active: mode === 'register' }" @click="mode = 'register'">注册</button>
        </div>

        <form @submit.prevent="submit">
          <label v-if="mode === 'register'" class="field">
            昵称
            <input v-model="name" type="text" placeholder="怎么称呼你" />
          </label>
          <label class="field">
            邮箱
            <input v-model="email" type="email" />
          </label>
          <label class="field">
            密码
            <input v-model="password" type="password" />
          </label>

          <p v-if="error" class="alert error">{{ error }}</p>

          <button class="primary block" type="submit" :disabled="busy">
            {{ busy ? '处理中…' : mode === 'login' ? '登录' : '注册并登录' }}
          </button>
        </form>

        <p class="hint">演示账号：demo@form.com / 123456</p>
      </div>
    </div>
  </div>
</template>