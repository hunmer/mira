import { getMiraClient } from '@/lib/miraClient'
import type { User, CreateAdminRequest, UpdateAdminRequest, ApiToken } from '@/types/auth'

export const adminApi = {
  list: (): Promise<User[]> => getMiraClient().admins().getAll(),
  create: (data: CreateAdminRequest) => getMiraClient().admins().create(data),
  update: (id: string, data: UpdateAdminRequest) => getMiraClient().admins().update(id, data),
  delete: (id: string) => getMiraClient().admins().delete(id),
  // API Token 管理
  listTokens: (id: string): Promise<ApiToken[]> => getMiraClient().admins().getTokens(id),
  createToken: (id: string, data: { name?: string; expiresInDays?: number | null }): Promise<ApiToken> =>
    getMiraClient().admins().createToken(id, data),
  updateToken: (id: string, tokenId: number, data: { name?: string; expiresInDays?: number | null }): Promise<ApiToken> =>
    getMiraClient().admins().updateToken(id, tokenId, data),
  deleteToken: (id: string, tokenId: number) => getMiraClient().admins().deleteToken(id, tokenId),
}
