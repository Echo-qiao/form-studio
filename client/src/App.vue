<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const user = useUserStore()

const blank = computed(() => route.meta.blank === true)

onMounted(() => user.ensureLoaded())

function logout() {
  user.logout()
  router.push('/login')
}
</script>

<template>
  <RouterView v-if="blank" />

  <div v-else class="shell">
    <header class="topbar">
      <RouterLink to="/forms" class="brand">
        <span class="logo">FD</span>
        <span>表单设计器</span>
      </RouterLink>
      <div class="topbar-right">
        <span class="muted">{{ user.me?.name ?? '' }}</span>
        <button class="ghost" @click="logout">退出</button>
      </div>
    </header>
    <main class="main">
      <RouterView />
    </main>
  </div>
</template>