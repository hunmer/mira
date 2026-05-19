export interface Library {
    id: string
    name: string
    path: string
    description?: string
    type: 'local' | 'remote'
    status: 'active' | 'inactive'
    fileCount: number
    size: number
    createdAt: string
    updatedAt: string
    icon?: string
    serverURL?: string
    serverPort?: string
    pluginsDir?: string
    customFields?: {
        path: string
        enableHash: boolean
        [key: string]: any
    }
}

export interface Plugin {
    name: string
    version: string
    description?: string
    author: string
    status: 'active' | 'inactive'
    configurable: boolean
    dependencies: string[]
    main: string
    createdAt: string
    updatedAt: string
    icon?: string | null
    category?: string
    tags?: string[]
    libraryId?: string
    libraryName?: string
}

export interface DatabaseTable {
    name: string
    schema: string
    rowCount: number
}

export interface DatabaseRow {
    [key: string]: any
}

export interface SystemStats {
    libraries: number
    plugins: number
    admins: number
    dbSize: string
}

export interface SystemInfo {
    uptime: string
    version: string
    nodeVersion: string
}

export interface RecentActivity {
    id: number
    message: string
    time: string
}

export interface DeviceInfo {
    id: string
    name: string
    type: string
    status: 'connected' | 'disconnected'
    lastSeen: string
    libraryId?: string
    [key: string]: any
}

// API响应的通用格式
export interface ApiResponse<T = any> {
    success: boolean
    message?: string
    data?: T
    error?: string
}
