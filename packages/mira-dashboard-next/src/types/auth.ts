export interface User {
  id: string
  username: string
  email: string
  role: 'super' | 'admin' | 'user'
  createdAt: string
  updatedAt: string
  is_active?: boolean
  /** 该账号的 API Token 数量 */
  tokenCount?: number
}

/** API Token（expiresAt = -1 表示永不过期） */
export interface ApiToken {
  id: number
  name: string
  token: string
  createdAt: number
  expiresAt: number
}

export interface LoginForm {
  username: string
  password: string
}

export interface CreateAdminForm {
  username: string
  email: string
  password: string
  confirmPassword: string
}

export interface LoginResponse {
  code: number
  message?: string
  data?: {
    accessToken: string
    user: User
  }
}

export interface CreateAdminRequest {
  username: string
  email: string
  password: string
}

export interface UpdateAdminRequest {
  email?: string
  username?: string
  password?: string
  role?: string
}

export interface AdminResponse {
  success: boolean
  message?: string
  data?: any
  error?: string
}
