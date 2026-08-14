import { getMiraClient } from '@/lib/miraClient'
import type {
  CookieSite,
  CreateCookieSiteRequest,
  UpdateCookieSiteRequest,
} from 'mira-app-core/shared/sdk'

export const cookieSiteApi = {
  list: (): Promise<CookieSite[]> => getMiraClient().cookieSites().getAll(),
  create: (data: CreateCookieSiteRequest): Promise<CookieSite> => getMiraClient().cookieSites().create(data),
  update: (id: number, data: UpdateCookieSiteRequest): Promise<CookieSite> => getMiraClient().cookieSites().update(id, data),
  remove: (id: number): Promise<{ id: number }> => getMiraClient().cookieSites().delete(id),
  setDefault: (id: number): Promise<CookieSite> => getMiraClient().cookieSites().setDefault(id),
}
