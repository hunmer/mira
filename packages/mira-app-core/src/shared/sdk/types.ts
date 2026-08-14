/**
 * Mira SDK 类型定义
 */

// 基础响应类型
export interface BaseResponse<T = any> {
    code?: number;
    success?: boolean;
    message: string;
    data: T;
    timestamp?: string;
}

// 错误响应类型
export interface ErrorResponse {
    error: string;
    message: string;
    timestamp: string;
    stack?: string;
}

// HTTP 客户端配置
export interface ClientConfig {
    baseURL: string;
    timeout?: number;
    headers?: Record<string, string>;
    token?: string;
    getToken?: () => string | undefined;
}

// 服务器设置
export interface ServerSettings {
    /** API 访问是否要求登录 */
    authRequired: boolean;
    /** 是否允许自注册 */
    allowRegistration: boolean;
}

// 认证相关类型
export interface LoginRequest {
    username: string;
    password: string;
}

export interface LoginResponse {
    accessToken: string;
}

export interface RegisterRequest {
    username: string;
    password: string;
}

export interface RegisterResponse {
    success: boolean;
    message: string;
    data?: {
        id: number;
        username: string;
    };
}

export interface UserInfo {
    id: number;
    username: string;
    realName: string;
    roles: string[];
    avatar: string;
    desc: string;
    homePath: string;
    role?: string;
}

export interface VerifyResponse {
    user: UserInfo;
}

// 管理员类型
export interface Admin {
    id: string;
    username: string;
    email: string;
    role: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateAdminRequest {
    username: string;
    email: string;
    password: string;
}

// 素材库类型
export interface LibraryCustomFields {
    enableHash?: boolean;
    enableAutoSync?: boolean;
    enableThumbScan?: boolean;
    enableAutoBackup?: boolean;
    enableDbMirror?: boolean;
    syncFilterMode?: 'blacklist' | 'whitelist';
    syncBlacklist?: string;
    syncWhitelist?: string;
    [key: string]: any;
}

export interface Library {
    id: string;
    name: string;
    path: string;
    status: 'active' | 'inactive' | 'error';
    fileCount: number;
    size: number;
    description: string;
    createdAt: string;
    updatedAt: string;
    icon?: string;
    customFields?: LibraryCustomFields;
    pluginsDir?: string;
    allowedRoles?: string[];
}

export interface CreateLibraryRequest {
    name: string;
    path: string;
    description: string;
    icon?: string;
    customFields?: LibraryCustomFields;
    pluginsDir?: string;
    allowedRoles?: string[];
}

export interface UpdateLibraryRequest {
    name?: string;
    path?: string;
    description?: string;
    icon?: string;
    customFields?: LibraryCustomFields;
    pluginsDir?: string;
    allowedRoles?: string[];
}

// 插件类型
export interface Plugin {
    id: string;
    pluginName: string;
    name: string;
    version: string;
    description: string;
    author: string;
    status: 'active' | 'inactive';
    configurable: boolean;
    dependencies: string[];
    main: string;
    libraryId: string;
    createdAt: string;
    updatedAt: string;
    icon: string;
    category: string;
    tags: string[];
}

export interface PluginsByLibrary {
    id: string;
    name: string;
    description: string;
    plugins: Plugin[];
}

export interface ServerWebPlugin {
    pluginName: string;
    pluginId: string;
    version: string;
    index: string;
    serverPluginName: string;
    libraryId: string;
    url: string;
    priority?: number;
    icon?: string;
    tags?: string[];
    category?: string;
    description?: string;
    author?: string;
    homepage?: string;
    enable?: boolean;
    config?: Record<string, any>;
    hotkey?: Record<string, any>;
    events?: string[];
    dependencies?: string[];
    permissions?: string[];
    minAppVersion?: string;
    platform?: string[];
}

export interface PreviewViewer {
    viewerId: string;
    pluginId: string;
    pluginName: string;
    serverPluginName: string;
    title: string;
    iframeUrl: string;
    priority: number;
    icon?: string;
}

export interface PreviewViewersResponse {
    libraryId: string;
    fileId: string;
    viewers: PreviewViewer[];
}

export interface InstallPluginRequest {
    name: string;
    version?: string;
    libraryId: string;
}

// 文件类型
export interface UploadFileRequest {
    files: File[] | FileList;
    libraryId: string;
    sourcePath?: string;
    clientId?: string;
    batchImport?: boolean;
    urlItems?: string[];
    fields?: any;
    payload?: {
        data: {
            tags?: string[];
            folder_id?: string;
        };
    };
}

export interface UploadResult {
    success: boolean;
    file: string;
    result?: any;
    error?: string;
}

export interface UploadResponse {
    results: UploadResult[];
}

export interface BatchImportOptions {
    folderId?: number | null;
    clientId?: string;
}

export interface BatchImportResponse {
    batchId: string;
    total: number;
    results?: UploadResult[];
}

export type BatchImportItem = File | string;

// 标签相关类型
export interface Tag {
    id: number;
    title: string;
    color?: number;
    icon?: string;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface TagQuery {
    title?: string;
    color?: number;
    limit?: number;
    offset?: number;
}

// 文件夹相关类型
export interface Folder {
    id: number;
    title: string;
    parent_id?: number;
    path?: string;
    color?: number;
    icon?: string;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface FolderQuery {
    title?: string;
    parent_id?: number;
    color?: number;
    limit?: number;
    offset?: number;
}

// 文件查询相关类型
export interface FileFilters {
    title?: string;
    extension?: string;
    tags?: string[];
    /**
     * 文件夹过滤。后端 getFiles 读取 key 是 `folder`（不是 folder_id）。
     * - 数字：按该文件夹过滤
     * - null：查"未分类"（folder_id IS NULL OR folder_id = 0）
     */
    folder?: number | null;
    /** 分类过滤（后端按扩展名集合映射）：image | video | audio */
    category?: 'image' | 'video' | 'audio';
    /** 0=正常（默认），1=回收站 */
    recycled?: number;
    size_min?: number;
    size_max?: number;
    /** metadata 过滤：按最长边 MAX(width, height) 过滤，单位像素 */
    metadata_dim_min?: number;
    metadata_dim_max?: number;
    /** metadata 过滤：按时长 duration 过滤，单位秒 */
    metadata_duration_min?: number;
    metadata_duration_max?: number;
    created_after?: string;
    created_before?: string;
    limit?: number;
    offset?: number;
}

export interface FileData {
    id: number;
    title: string;
    path: string;
    size: number;
    extension: string;
    mime_type: string;
    tags: string[];
    folder_id: number | null;
    hash?: string;
    thumbnail_path?: string;
    created_at: string;
    updated_at: string;
    imported_at: number;
}

// 数据库类型
export interface DatabaseTable {
    name: string;
    schema: string;
    rowCount: number;
}

export interface TableColumn {
    name: string;
    type: string;
    notnull: number;
    pk: number;
    dflt_value: string;
}

// 设备类型
export interface Device {
    clientId: string;
    libraryId: string;
    connectionTime: string;
    lastActivity: string;
    requestInfo: {
        url: string;
        headers: Record<string, any>;
        remoteAddress: string;
    };
    status: 'connected' | 'disconnected';
    userAgent: string;
    ipAddress: string;
}

export interface DevicesResponse {
    success: boolean;
    data: Record<string, Device[]>;
    timestamp: string;
}

export interface DeviceStatsResponse {
    success: boolean;
    data: {
        totalDevices: number;
        connectedDevices: number;
        libraryStats: Record<string, {
            deviceCount: number;
            activeConnections: number;
        }>;
    };
}

export interface DisconnectDeviceRequest {
    clientId: string;
    libraryId: string;
}

export interface SendMessageRequest {
    clientId: string;
    libraryId: string;
    message: any;
}

// 系统状态类型
export interface HealthResponse {
    success: boolean;
    status: string;
    timestamp: string;
    uptime: number;
    version: string;
    nodeVersion?: string;
    environment?: string;
    authRequired?: boolean;
    allowRegistration?: boolean;
}

// 更新用户信息请求
export interface UpdateUserRequest {
    realName?: string;
    avatar?: string;
}

// WebSocket 相关类型
export interface WebSocketOptions {
    clientId?: string;
    libraryId?: string;
    token?: string;
    reconnect?: boolean;
    reconnectInterval?: number;
    maxReconnectAttempts?: number;
    headers?: Record<string, string>;
}

export interface WebSocketMessage {
    eventName: string;
    data: Record<string, any>;
    requestId?: string;
    action?: string;
    payload?: any;
    libraryId?: string;
}

export type WebSocketEventCallback = (data: any) => void;
