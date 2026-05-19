export interface User {
    id: string
    username: string
    email: string
    role: 'admin' | 'user'
    createdAt: string
    updatedAt: string
    is_active?: boolean
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
    success: boolean
    message?: string
    data?: {
        token: string
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
}

export interface AdminResponse {
    success: boolean
    message?: string
    data?: any
    error?: string
}
