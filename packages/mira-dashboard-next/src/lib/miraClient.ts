import { MiraClient } from 'mira-app-core/shared/sdk'
import { getApiBaseURL, handleUnauthorized } from '@/api/client'

let client: MiraClient | null = null
let clientBaseURL = ''

export function getMiraClient(): MiraClient {
  const baseURL = getApiBaseURL().replace(/\/api\/?$/, '')
  if (!client || clientBaseURL !== baseURL) {
    clientBaseURL = baseURL
    client = new MiraClient(baseURL, {
      getToken: () => localStorage.getItem('token') || undefined,
    })
    // SDK 内部的响应拦截器已把错误转成 ErrorResponse（携带 status 字段）
    client.getHttpClient().getAxiosInstance().interceptors.response.use(
      undefined,
      (error) => {
        const status = error?.response?.status ?? error?.status
        if (status === 401) handleUnauthorized()
        return Promise.reject(error)
      },
    )
  }
  return client
}
