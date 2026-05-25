import client from '../client'
import type { LoginForm, LoginResponse } from '@/types/auth'

export const authApi = {
  login: (data: LoginForm) => client.post<LoginResponse>('/login', data),
  logout: () => client.post('/logout'),
  me: () => client.get('/me'),
}
