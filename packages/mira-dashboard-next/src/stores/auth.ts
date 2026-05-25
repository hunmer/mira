import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types/auth'
import { authApi } from '@/api'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || '')
  const user = ref<User | null>(
    JSON.parse(localStorage.getItem('user') || 'null'),
  )

  const isLoggedIn = computed(() => !!token.value)
  const userRole = computed(() => user.value?.role || '')

  async function login(username: string, password: string) {
    const res = await authApi.login({ username, password })
    const data = res.data
    if (data.success && data.data) {
      token.value = data.data.token
      user.value = data.data.user
      localStorage.setItem('token', data.data.token)
      localStorage.setItem('user', JSON.stringify(data.data.user))
    } else {
      throw new Error(data.message || 'Login failed')
    }
  }

  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return { token, user, isLoggedIn, userRole, login, logout }
})
