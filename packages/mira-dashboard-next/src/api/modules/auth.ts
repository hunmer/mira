import client from '../client'
import { getMiraClient } from '@/lib/miraClient'
import type { LoginForm, LoginResponse, ApiToken } from '@/types/auth'

export const authApi = {
  login: (data: LoginForm) => client.post<LoginResponse>('/auth/login', data),
  logout: () => client.post('/auth/logout'),
  me: () => client.get('/user/info'),
  register: (data: { username: string; password: string; email?: string }) =>
    client.post('/auth/register', data),
  changePassword: (data: { oldPassword: string; newPassword: string }) =>
    getMiraClient().user().changePassword(data.oldPassword, data.newPassword),
  uploadAvatar: (image: string) => getMiraClient().user().uploadAvatar(image),
  /** 当前用户的 API Token 列表 */
  myTokens: (): Promise<ApiToken[]> => getMiraClient().user().getTokens(),
}
