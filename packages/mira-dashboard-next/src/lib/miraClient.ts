import { MiraClient } from 'mira-app-core/shared/sdk'
import { getApiBaseURL } from '@/api/client'

let client: MiraClient | null = null
let clientBaseURL = ''

export function getMiraClient(): MiraClient {
  const baseURL = getApiBaseURL().replace(/\/api\/?$/, '')
  if (!client || clientBaseURL !== baseURL) {
    clientBaseURL = baseURL
    client = new MiraClient(baseURL, {
      getToken: () => localStorage.getItem('token') || undefined,
    })
  }
  return client
}
