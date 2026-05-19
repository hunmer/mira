import type { FileInfo } from '../../../shared/types'

/**
 * 工具方法模块
 * 包含文件类型判断、路径处理等工具函数
 */
export class HomeControllerUtils {
  /**
   * 获取文件类型
   * @param fileName - 文件名（包含扩展名）
   * @returns 文件类型
   */
  static getFileType(fileName: string): 'image' | 'video' | 'audio' | 'document' | 'folder' {
    if (!fileName) return 'document'

    const name = fileName.toLowerCase()

    if (/\.(jpg|jpeg|png|gif|bmp|svg|webp)$/i.test(name)) {
      return 'image'
    } else if (/\.(mp4|avi|mov|wmv|flv|webm|mkv)$/i.test(name)) {
      return 'video'
    } else if (/\.(mp3|wav|flac|aac|ogg|wma)$/i.test(name)) {
      return 'audio'
    } else {
      return 'document'
    }
  }

  /**
   * 从 FileInfo 获取文件类型
   * @param item - FileInfo 对象
   * @returns 文件类型
   */
  static getFileTypeFromInfo(item: FileInfo): 'image' | 'video' | 'audio' | 'document' | 'folder' {
    if (!item.mimeType) return 'document'

    if (item.mimeType.startsWith('image/')) return 'image'
    if (item.mimeType.startsWith('video/')) return 'video'
    if (item.mimeType.startsWith('audio/')) return 'audio'
    return 'document'
  }

  /**
   * 获取文件扩展名
   * @param fileName - 文件名
   * @returns 文件扩展名
   */
  static getFileExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.')
    return lastDotIndex > 0 ? fileName.substring(lastDotIndex + 1).toLowerCase() : ''
  }
}