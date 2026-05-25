import client from '../client'
import type { LoginForm, LoginResponse } from '@/types/auth'

export const authApi = {
  login: (data: LoginForm) => client.post<LoginResponse>('/auth/login', data),
  logout: () => client.post('/auth/logout'),
  me: () => client.get('/user/info'),
  register: (data: { username: string; password: string; email?: string }) =>
    client.post('/auth/register', data),
}
