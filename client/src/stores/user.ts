import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchMe, login as apiLogin, register as apiRegister, type UserInfo } from '@/api'
import { clearToken, getToken, setToken } from '@/api/http'

export const useUserStore = defineStore('user', () => {
  const me = ref<UserInfo | null>(null)

  async function login(email: string, password: string) {
    const data = await apiLogin(email, password)
    setToken(data.token)
    me.value = data.user
  }

  async function register(email: string, password: string, name: string) {
    const data = await apiRegister(email, password, name)
    setToken(data.token)
    me.value = data.user
  }

  async function ensureLoaded() {
    if (me.value || !getToken()) return
    try {
      me.value = await fetchMe()
    } catch {
      logout()
    }
  }

  function logout() {
    clearToken()
    me.value = null
  }

  return { me, login, register, ensureLoaded, logout }
})