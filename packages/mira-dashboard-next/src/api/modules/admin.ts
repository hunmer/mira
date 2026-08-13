import client from '../client'
import type { User, CreateAdminRequest, UpdateAdminRequest, AdminResponse, ApiToken } from '@/types/auth'

export const adminApi = {
  list: () => client.get<User[]>('/admins'),
  create: (data: CreateAdminRequest) => client.post<AdminResponse>('/admins', data),
  update: (id: string, data: UpdateAdminRequest) => client.put<AdminResponse>(`/admins/${id}`, data),
  delete: (id: string) => client.delete<AdminResponse>(`/admins/${id}`),
  // API Token 管理
  listTokens: (id: string) => client.get<ApiToken[]>(`/admins/${id}/tokens`),
  createToken: (id: string, data: { name?: string; expiresInDays?: number | null }) =>
    client.post<AdminResponse & { data?: ApiToken }>(`/admins/${id}/tokens`, data),
  updateToken: (id: string, tokenId: number, data: { name?: string; expiresInDays?: number | null }) =>
    client.put<AdminResponse & { data?: ApiToken }>(`/admins/${id}/tokens/${tokenId}`, data),
  deleteToken: (id: string, tokenId: number) =>
    client.delete<AdminResponse>(`/admins/${id}/tokens/${tokenId}`),
}
