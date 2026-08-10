export interface Library {
  id: string
  name: string
  path: string
  description?: string
  status: 'active' | 'inactive'
  fileCount: number
  size: number
  createdAt: string
  updatedAt: string
  icon?: string
  pluginsDir?: string
  allowedRoles?: string[]
  customFields?: {
    enableHash: boolean
    enableAutoSync?: boolean
    enableAutoBackup?: boolean
    [key: string]: any
  }
}

export interface ServerSettings {
  authRequired: boolean
  allowRegistration: boolean
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
  title?: string
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

export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  error?: string
}
