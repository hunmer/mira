import { getMiraClient } from '@/lib/miraClient'
import type { ServerSettings } from 'mira-app-core/shared/sdk'

export const settingsApi = {
  get: (): Promise<ServerSettings> => getMiraClient().settings().get(),
  update: (data: Partial<ServerSettings>) => getMiraClient().settings().update(data),
}
