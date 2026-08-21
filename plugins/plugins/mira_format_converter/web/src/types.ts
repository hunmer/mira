export interface MediaInput {
  id: string
  libraryId?: string
  name: string
  url?: string
  thumbnailURL?: string
}

export type MediaCategory = 'image' | 'video' | 'audio' | 'unknown'

export type ItemStatus = 'pending' | 'running' | 'importing' | 'done' | 'error'

export interface TaskItemState {
  fileId: number
  name: string
  srcExt: string
  category: MediaCategory
  status: ItemStatus
  progress: number
  error?: string
  duplicate?: boolean
  newFileId?: number
  newFileName?: string
}

export interface TaskState {
  taskId: string
  createdAt: number
  finishedAt: number | null
  status: 'running' | 'done'
  params: { target: string; quality: string; inheritMeta: boolean }
  items: TaskItemState[]
}

export interface BinaryInfo {
  path: string
  available: boolean
  version: string
}

export interface Capabilities {
  ffmpeg: BinaryInfo
  imagemagick: BinaryInfo
  targets: { image: string[]; video: string[]; audio: string[] }
  qualities: Record<string, string>
}

export type ScaleKey = 'none' | 'percent50' | 'width1920' | 'width1280' | 'width640'

export const SCALE_OPTIONS: Array<{ key: ScaleKey; label: string }> = [
  { key: 'none', label: '原始尺寸' },
  { key: 'percent50', label: '50%' },
  { key: 'width1920', label: '宽 ≤ 1920' },
  { key: 'width1280', label: '宽 ≤ 1280' },
  { key: 'width640', label: '宽 ≤ 640' },
]

export function scalePayload(key: ScaleKey): 'none' | { percent: number } | { width: number } {
  if (key === 'percent50') return { percent: 50 }
  if (key === 'width1920') return { width: 1920 }
  if (key === 'width1280') return { width: 1280 }
  if (key === 'width640') return { width: 640 }
  return 'none'
}

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'tif', 'avif', 'heic', 'heif', 'svg', 'ico', 'psd']
const VIDEO_EXTS = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'wmv', 'm4v', 'ts', 'mpg', 'mpeg', '3gp', 'ogv']
const AUDIO_EXTS = ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg', 'wma', 'opus', 'aiff', 'amr']

export function classifyFile(name: string): MediaCategory {
  const ext = String(name || '').split('.').pop()?.toLowerCase() || ''
  if (IMAGE_EXTS.includes(ext)) return 'image'
  if (VIDEO_EXTS.includes(ext)) return 'video'
  if (AUDIO_EXTS.includes(ext)) return 'audio'
  return 'unknown'
}

export const CATEGORY_LABELS: Record<MediaCategory, string> = {
  image: '图片',
  video: '视频',
  audio: '音频',
  unknown: '未知',
}

/** 源类别允许的目标格式（须与服务端 allowedTargets 一致：视频额外可转 gif） */
export function allowedTargets(category: MediaCategory): string[] {
  if (category === 'image') return ['png', 'jpg', 'webp', 'gif', 'bmp', 'tiff', 'avif', 'heic']
  if (category === 'video') return ['mp4', 'webm', 'mov', 'avi', 'mkv', 'gif']
  if (category === 'audio') return ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg']
  return []
}
