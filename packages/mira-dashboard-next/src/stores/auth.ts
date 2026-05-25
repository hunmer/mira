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
    if (body.code === 0 && body.data?.accessToken) {
      token.value = body.data.accessToken
      localStorage.setItem('token', body.data.accessToken)

      // 优先使用登录响应中的用户信息，否则通过 /user/info 获取
      if (body.data.user) {
        user.value = body.data.user
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
