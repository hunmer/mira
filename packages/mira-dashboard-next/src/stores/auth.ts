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
    const body = res.data
    const data = body.data
    if (data?.accessToken) {
      token.value = data.accessToken
      localStorage.setItem('token', data.accessToken)

      if (data.user) {
        user.value = data.user
        localStorage.setItem('user', JSON.stringify(user.value))
      } else {
        try {
          const meRes = await authApi.me()
          user.value = meRes.data?.data || meRes.data
          localStorage.setItem('user', JSON.stringify(user.value))
        } catch {
          user.value = { id: '', username, email: '', role: 'user', createdAt: '', updatedAt: '' }
          localStorage.setItem('user', JSON.stringify(user.value))
        }
      }
    } else {
      throw new Error(body.message || 'Login failed')
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
