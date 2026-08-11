import client from '../client'
import type { CookieSite } from '@/types/mira'

export const cookieSiteApi = {
  list: () => client.get<{ code: number; data: CookieSite[] }>('/cookie-sites'),
  create: (data: Partial<CookieSite>) => client.post<{ code: number; data: CookieSite }>('/cookie-sites', data),
  update: (id: number, data: Partial<CookieSite>) => client.put<{ code: number; data: CookieSite }>(`/cookie-sites/${id}`, data),
  remove: (id: number) => client.delete<{ code: number }>(`/cookie-sites/${id}`),
  setDefault: (id: number) => client.put<{ code: number; data: CookieSite }>(`/cookie-sites/${id}/default`),
}
