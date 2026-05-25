import client from '../client'
import type { Library } from '@/types/mira'

export const libraryApi = {
  list: () => client.get<Library[]>('/libraries'),
  get: (id: string) => client.get<Library>(`/libraries/${id}`),
  create: (data: Partial<Library>) => client.post<Library>('/libraries', data),
  update: (id: string, data: Partial<Library>) => client.put<Library>(`/libraries/${id}`, data),
  delete: (id: string) => client.delete(`/libraries/${id}`),
}
