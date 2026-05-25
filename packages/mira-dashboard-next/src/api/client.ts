import axios from 'axios'
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios'

const STORAGE_KEY = 'api_base_url'

function normalizeBaseURL(url: string) {
  return url.replace(/\/$/, '').replace(/\/api$/, '') + '/api'
}

function getBaseURL() {
  const raw = localStorage.getItem(STORAGE_KEY) || import.meta.env.VITE_API_BASE_URL || '/api'
  return normalizeBaseURL(raw)
}

const client: AxiosInstance = axios.create({
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

function applyBaseURL() {
  client.defaults.baseURL = getBaseURL()
}

applyBaseURL()

export function setApiBaseURL(url: string) {
  if (url) {
    localStorage.setItem(STORAGE_KEY, url)
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
  applyBaseURL()
}

export function getApiBaseURL() {
  return getBaseURL()
}

export function getDefaultBaseURL() {
  return normalizeBaseURL(import.meta.env.VITE_API_BASE_URL || '/api')
}

client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status
    if (status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

export default client
