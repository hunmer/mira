import type { FileInfo } from '../../shared/types'
import { environment } from './index'

export const CONVERTED_IMAGE_EXTENSIONS = ['tif', 'tiff', 'psd', 'psb', 'heic', 'heif', 'cr2', 'cr3', 'nef', 'arw', 'dng', 'orf', 'rw2', 'raf', 'jp2', 'j2k', 'jpc', 'exr', 'hdr', 'tga', 'pcx', 'dds', 'dcm', 'dpx', 'fits', 'eps', 'ai', 'cur', 'xpm', 'xbm']
export const VIDEO_EXTENSIONS = ['mp4', 'mov', 'avi', 'mkv', 'flv', 'webm', 'wmv', 'm4v', 'mpg', 'mpeg', 'mts', 'm2ts', 'ts', '3gp']
export const AUDIO_EXTENSIONS = ['mp3', 'm4a', 'wav', 'flac', 'aac', 'ogg', 'opus', 'wma', 'ape', 'alac']
export const HLS_PREVIEW_EXTENSIONS = ['mov', 'avi', 'mkv', 'flv', 'wmv', 'm4v', 'mpg', 'mpeg', 'mts', 'm2ts', 'ts', '3gp', 'flac', 'aac', 'opus', 'wma', 'ape', 'alac']

/**
 * 文件处理工具函数
 */

/**
 * 本地路径转 file:// URL，用于 <img src> 等
 * 已是 http/https/file 协议的路径直接返回
 */
export function toFileUrl(path: unknown): string | undefined {
  if (path && typeof path === 'object') {
    const value = path as Record<string, unknown>
    path = value.url ?? value.path ?? value.filePath ?? value.localFile ?? value.href
  }
  if (typeof path !== 'string' || !path) return undefined
  const getLibraryCacheContext = () => {
    if (typeof window === 'undefined' || !window.electronAPI) return false
    try {
      const raw = localStorage.getItem('mira-settings')
      const libraryId = localStorage.getItem('mira-active-library-id') || ''
      const enabled = raw ? Boolean(JSON.parse(raw)?.thumbnailCacheLibraries?.[libraryId]) : false
      return enabled && libraryId ? libraryId : false
    } catch { return false }
  }
  if (path.startsWith('http://') || path.startsWith('https://')) {
    // Electron 缓存协议：设置由 ConfigStorage 同步镜像到 localStorage。
    const libraryId = getLibraryCacheContext()
    if (libraryId) return `library-thumb://load?libraryId=${encodeURIComponent(String(libraryId))}&url=${encodeURIComponent(path)}`
    return path
  }
  if (path.startsWith('file://')) {
    const libraryId = getLibraryCacheContext()
    if (libraryId) return `library-file://load?libraryId=${encodeURIComponent(String(libraryId))}&url=${encodeURIComponent(path)}`
    return path
  }
  let normalized = path.replace(/\\/g, '/')
  if (normalized.match(/^[a-zA-Z]:/)) {
    return `file:///${encodeURI(normalized)}`
  }
  if (normalized.startsWith('//')) {
    return `file:${encodeURI(normalized)}`
  }
  if (normalized.startsWith('/')) {
    return `file://${encodeURI(normalized)}`
  }
  return `file:///${encodeURI(normalized)}`
}

/**
 * 给图片 URL 添加缓存破坏参数，避免预览切换时复用旧图片缓存
 */
export function withCacheBust(url: string | undefined, cacheKey?: string | number): string | undefined {
  if (!url || cacheKey === undefined || cacheKey === null || cacheKey === '') return url

  const [urlWithoutHash, hash = ''] = url.split('#')
  const separator = urlWithoutHash.includes('?') ? '&' : '?'

  return `${urlWithoutHash}${separator}_t=${encodeURIComponent(String(cacheKey))}${hash ? `#${hash}` : ''}`
}

export function toCacheBustedFileUrl(path: string | undefined, cacheKey?: string | number): string | undefined {
  return withCacheBust(toFileUrl(path), cacheKey)
}

export function getPreviewImageSource(image: FileInfo | undefined): string | undefined {
  const extension = getFileExtension(image?.name || '')
  const remoteSource = image?.path || image?.url
  if (CONVERTED_IMAGE_EXTENSIONS.includes(extension) && remoteSource?.match(/^https?:\/\//)) {
    return remoteSource.replace('/api/files/file/', '/api/files/preview/')
  }
  // 网页端浏览器禁止访问 file://，跳过 localFile，统一走 HTTP path/url
  if (!environment.isElectron) {
    return remoteSource
  }
  return image?.localFile || image?.path || image?.url
}

export function getMediaFileUrl(file: FileInfo | undefined): string {
  return toFileUrl(getPreviewImageSource(file)) || ''
}

export function getMediaPreviewSource(file: FileInfo | undefined): string {
  const extension = getFileExtension(file?.name || '')
  const remoteSource = file?.path || file?.url
  if (HLS_PREVIEW_EXTENSIONS.includes(extension) && remoteSource?.match(/^https?:\/\//)) {
    const [url, query] = remoteSource.split('?', 2)
    const previewUrl = url.replace('/api/files/file/', '/api/files/preview/')
    if (previewUrl !== url) return `${previewUrl}/index.m3u8${query ? `?${query}` : ''}`
  }
  if (!environment.isElectron) return remoteSource || ''
  return toFileUrl(file?.localFile || remoteSource) || ''
}

export function getCacheBustedPreviewImageSource(
  image: FileInfo | undefined,
  cacheKey?: string | number
): string | undefined {
  return toCacheBustedFileUrl(getPreviewImageSource(image), cacheKey)
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 获取文件扩展名
 */
export function getFileExtension(filename: string): string {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2).toLowerCase()
}

/**
 * 根据文件名判断文件类型
 */
export function getFileType(filename: string): 'image' | 'video' | 'audio' | 'document' | 'other' {
  const ext = getFileExtension(filename)
  
  const imageExts = ['jpg', 'jpeg', 'jfif', 'png', 'gif', 'bmp', 'webp', 'svg', 'avif', 'ico', ...CONVERTED_IMAGE_EXTENSIONS]
  const documentExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf']
  
  if (imageExts.includes(ext)) return 'image'
  if (VIDEO_EXTENSIONS.includes(ext)) return 'video'
  if (AUDIO_EXTENSIONS.includes(ext)) return 'audio'
  if (documentExts.includes(ext)) return 'document'
  
  return 'other'
}

/**
 * 获取文件类型图标
 */
export function getFileTypeIcon(filename: string): string {
  const type = getFileType(filename)
  
  const iconMap = {
    image: 'image',
    video: 'videocam',
    audio: 'volume_up',
    document: 'description',
    other: 'insert_drive_file'
  }
  
  return iconMap[type]
}

/**
 * 验证文件类型是否允许
 */
export function isFileTypeAllowed(filename: string, allowedTypes: string[]): boolean {
  const fileType = getFileType(filename)
  const mimeType = getMimeType(filename)
  
  return allowedTypes.some(type => {
    if (type === '*') return true
    if (type.endsWith('/*')) {
      const baseType = type.slice(0, -2)
      return mimeType.startsWith(baseType)
    }
    if (type.includes('/')) {
      return mimeType === type
    }
    return fileType === type
  })
}

/**
 * 根据文件名获取 MIME 类型
 */
export function getMimeType(filename: string): string {
  const ext = getFileExtension(filename)
  
  const mimeTypes: Record<string, string> = {
    // 图片
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    jfif: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    bmp: 'image/bmp',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    avif: 'image/avif',
    ico: 'image/x-icon',
    
    // 视频
    mp4: 'video/mp4',
    avi: 'video/x-msvideo',
    mov: 'video/quicktime',
    wmv: 'video/x-ms-wmv',
    flv: 'video/x-flv',
    webm: 'video/webm',
    mkv: 'video/x-matroska',
    '3gp': 'video/3gpp',
    
    // 音频
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    flac: 'audio/flac',
    aac: 'audio/aac',
    ogg: 'audio/ogg',
    wma: 'audio/x-ms-wma',
    m4a: 'audio/mp4',
    
    // 文档
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain',
    rtf: 'application/rtf'
  }
  
  return mimeTypes[ext] || 'application/octet-stream'
}

/**
 * 创建文件下载
 */
export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * 读取文件内容
 */
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/**
 * 读取文件为文本
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

/**
 * 压缩图片
 */
export function compressImage(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 0.8
): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      // 计算新尺寸
      let { width, height } = img
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width *= ratio
        height *= ratio
      }
      
      canvas.width = width
      canvas.height = height
      
      // 绘制并压缩
      ctx?.drawImage(img, 0, 0, width, height)
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: file.lastModified
            })
            resolve(compressedFile)
          } else {
            reject(new Error('压缩失败'))
          }
        },
        file.type,
        quality
      )
    }
    
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = URL.createObjectURL(file)
  })
}

/**
 * 验证文件大小
 */
export function validateFileSize(file: File, maxSize: number): boolean {
  return file.size <= maxSize
}

/**
 * 生成唯一文件名
 */
export function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const ext = getFileExtension(originalName)
  const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.'))

  return `${nameWithoutExt}_${timestamp}_${random}.${ext}`
}

/**
 * 创建视频缩略图（封面图）
 * @param file 视频文件
 * @param time 提取缩略图的时间点（秒），默认为视频长度的 10% 处或 1 秒
 * @param width 缩略图宽度，默认为 320
 * @returns 返回包含封面图 dataURL 的 Promise
 */
export function createVideoThumbnail(
  file: File,
  time?: number,
  width: number = 320
): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.muted = true
    video.crossOrigin = 'anonymous'
    video.preload = 'metadata'

    const url = URL.createObjectURL(file)
    video.src = url

    const cleanup = () => {
      URL.revokeObjectURL(url)
      video.remove()
    }

    video.addEventListener('loadedmetadata', () => {
      // 计算提取时间点
      const seekTime = time ?? Math.min(video.duration * 0.1, 1)
      video.currentTime = seekTime
    })

    video.addEventListener('seeked', () => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          cleanup()
          reject(new Error('无法获取 canvas 上下文'))
          return
        }

        // 计算缩略图尺寸，保持宽高比
        const aspectRatio = video.videoWidth / video.videoHeight
        const height = Math.round(width / aspectRatio)

        canvas.width = width
        canvas.height = height

        // 绘制视频帧
        ctx.drawImage(video, 0, 0, width, height)

        // 转换为 dataURL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85)

        cleanup()
        resolve(dataUrl)
      } catch (error) {
        cleanup()
        reject(error)
      }
    })

    video.addEventListener('error', (e) => {
      cleanup()
      reject(new Error(`视频加载失败: ${(e.target as HTMLVideoElement).error?.message || '未知错误'}`))
    })

    // 设置超时保护，防止视频无法加载
    const timeout = setTimeout(() => {
      cleanup()
      reject(new Error('视频缩略图生成超时'))
    }, 10000)

    // 监听完成事件以清除超时
    video.addEventListener('seeked', () => clearTimeout(timeout))
    video.addEventListener('error', () => clearTimeout(timeout))
  })
}

/**
 * 创建文件预览 URL
 * 图片直接返回 objectURL，视频返回封面图 dataURL
 */
export async function createFilePreviewUrl(file: File): Promise<string | undefined> {
  if (file.type.startsWith('image/')) {
    return URL.createObjectURL(file)
  }

  if (file.type.startsWith('video/')) {
    try {
      return await createVideoThumbnail(file)
    } catch (error) {
      console.warn('生成视频缩略图失败:', error)
      return undefined
    }
  }

  return undefined
}
