import client from '../client'
import type { User, CreateAdminRequest, UpdateAdminRequest, AdminResponse } from '@/types/auth'

export const adminApi = {
  list: () => client.get<User[]>('/admins'),
  create: (data: CreateAdminRequest) => client.post<AdminResponse>('/admins', data),
  update: (id: string, data: UpdateAdminRequest) => client.put<AdminResponse>(`/admins/${id}`, data),
  delete: (id: string) => client.delete<AdminResponse>(`/admins/${id}`),
}
