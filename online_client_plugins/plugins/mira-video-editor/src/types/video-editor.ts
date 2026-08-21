/**
 * 视频剪辑工具类型定义
 */

/**
 * 视频片段数据
 */
export interface VideoClip {
  clip_id: string
  start: number // 开始时间（秒）
  end: number   // 结束时间（秒）
  tags: string[]
  desc: string
  thumbnail?: string // 封面图路径
}

/**
 * 视频元数据
 */
export interface VideoMetadata {
  width?: number
  height?: number
  fps?: number
  bitrate?: number
  codec?: string
  format?: string
  [key: string]: any
}

/**
 * 水印区域（归一化坐标 0-1）
 */
export interface WatermarkRegion {
  id: string
  x: number  // 0-1
  y: number  // 0-1
  w: number  // 0-1
  h: number  // 0-1
  desc?: string
}

/**
 * 视频数据
 */
export interface VideoData {
  id: string
  title: string
  path: string // 文件路径（本地文件为 blob:// URL，服务器文件为远程 URL）
  originalPath?: string // 原始本地文件路径（用于导出等操作）
  size: number // 文件大小（字节）
  duration: number // 时长（秒）
  create_date: string // 创建日期
  clips: Record<string, VideoClip> // 片段映射
  metadata: VideoMetadata
  thumbnail?: string // 缩略图路径
  watermarks?: {
    enabled: boolean
    regions: WatermarkRegion[]
  }
}

/**
 * 视频列表
 */
export interface VideoList {
  id: string
  name: string
  description?: string
  videos: VideoData[]
  create_date: string
  update_date: string
  type: 'local' | 'server' // 列表类型
}

/**
 * 视频剪辑工具配置
 */
export interface VideoEditorConfig {
  defaultPlaybackRate: number
  autoSave: boolean
  autoSaveInterval: number // 自动保存间隔（毫秒）
  maxClipDuration: number // 最大片段时长（秒）
  enableKeyboardShortcuts: boolean
}

/**
 * 工具类型
 */
export enum EditorToolType {
  CUT = 'cut',           // 剪切
  TRIM = 'trim',         // 修剪
  SPLIT = 'split',       // 分割
  MERGE = 'merge',       // 合并
  TAG = 'tag',           // 标签
  METADATA = 'metadata', // 元数据
  EXPORT = 'export'      // 导出
}

/**
 * 工具定义
 */
export interface EditorTool {
  id: EditorToolType
  name: string
  icon: string
  description: string
  component?: any // Vue 组件
}

/**
 * 剪辑操作历史记录
 */
export interface EditHistory {
  id: string
  timestamp: number
  action: string
  data: any
  videoId: string
}

/**
 * 导出选项
 */
export interface ExportOptions {
  format: 'mp4' | 'webm' | 'avi' | 'mov'
  quality: 'low' | 'medium' | 'high' | 'original'
  includeAudio: boolean
  clips?: string[] // 要导出的片段ID列表
}

/**
 * API 请求/响应类型
 */

// 获取视频列表
export interface GetVideoListsRequest {
  type?: 'local' | 'server'
}

export interface GetVideoListsResponse {
  success: boolean
  data: VideoList[]
  error?: string
}

// 创建视频列表
export interface CreateVideoListRequest {
  name: string
  description?: string
  type: 'local' | 'server'
}

export interface CreateVideoListResponse {
  success: boolean
  data: VideoList
  error?: string
}

// 添加视频到列表
export interface AddVideoToListRequest {
  listId: string
  file?: File // 本地文件
  path?: string // 服务器路径
}

export interface AddVideoToListResponse {
  success: boolean
  data: VideoData
  error?: string
}

// 获取视频信息
export interface GetVideoInfoRequest {
  videoId: string
  listId: string
}

export interface GetVideoInfoResponse {
  success: boolean
  data: VideoData
  error?: string
}

// 获取视频详细元数据（使用 ffprobe）
export interface GetVideoMetadataRequest {
  videoPath: string
}

export interface GetVideoMetadataResponse {
  success: boolean
  data: {
    duration: number
    metadata: VideoMetadata
  }
  error?: string
}

// 更新视频片段
export interface UpdateVideoClipsRequest {
  videoId: string
  listId: string
  clips: Record<string, VideoClip>
}

export interface UpdateVideoClipsResponse {
  success: boolean
  data: VideoData
  error?: string
}

// 删除视频
export interface DeleteVideoRequest {
  videoId: string
  listId: string
}

export interface DeleteVideoResponse {
  success: boolean
  error?: string
}

// 导出视频片段
export interface ExportClipsRequest {
  videoId: string
  listId: string
  clipIds: string[]
  options: ExportOptions
}

export interface ExportClipsResponse {
  success: boolean
  data: {
    outputPath: string
    size: number
    duration: number
  }
  error?: string
}

// 视频场景分割
export interface SplitVideoScenesRequest {
  videoPath: string
  sensitivity?: 'low' | 'medium' | 'high'
  minSceneDuration?: number
  pySceneDetectPath?: string
  cacheDirectory?: string
  videoId?: string
  startTime?: number // 开始时间（秒）
  endTime?: number   // 结束时间（秒）
}

export interface SceneSegment {
  startTime: number
  endTime: number
  thumbnail?: string
}

export interface SplitVideoScenesResponse {
  success: boolean
  data: {
    scenes: SceneSegment[]
    tempDir: string
  }
  error?: string
}

// 导出场景
export interface ExportScenesRequest {
  listId: string
  videoId: string
  videoPath: string // 原视频路径，用于 ffmpeg 裁切
  tempDir: string
  scenes: Array<{
    startTime: number
    endTime: number
  }>
  options: ExportOptions
  watermarkRegions?: Array<{ x: number; y: number; w: number; h: number }>
  videoWidth?: number
  videoHeight?: number
}

export interface ExportScenesResponse {
  success: boolean
  data: {
    outputPaths: string[]
    totalSize: number
  }
  error?: string
}

// 合并导出场景
export interface MergeAndExportScenesRequest {
  listId: string
  videoId: string
  videoPath: string
  tempDir: string
  mergedIds: string[] // 合并的原始场景ID列表
  mergedScene: {
    startTime: number
    endTime: number
  }
  options: ExportOptions
  watermarkRegions?: Array<{ x: number; y: number; w: number; h: number }>
  videoWidth?: number
  videoHeight?: number
}

export interface MergeAndExportScenesResponse {
  success: boolean
  data: {
    outputPath: string
    size: number
  }
  error?: string
}
