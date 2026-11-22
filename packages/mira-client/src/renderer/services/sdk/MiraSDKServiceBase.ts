import type { MiraClient } from 'mira-app-core/shared/sdk'
import type { MiraConnectionConfig } from '../../../shared/types'

/**
 * MiraSDKService 基类（partial 拆分的共享状态层）
 *
 * 持有连接状态与跨模块共用的 protected 辅助方法。
 * 各 SDK 模块 partial（services/sdk/parts/*）与本类共同组合出完整的
 * MiraSDKService：运行时由 applyMixins 复制原型，类型上由
 * `interface MiraSDKService extends ...Parts` 声明合并（同一基类声明，
 * protected 成员兼容，等价 partial class）。
 */
export abstract class MiraSDKServiceBase {
  protected client: MiraClient | null = null
  protected isConnected: boolean = false
  protected connectionConfig: MiraConnectionConfig | null = null
  protected _pendingWebsocketUrl?: string

  /**
   * 辅助方法：从文件名提取扩展名
   */
  protected getFileExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.')
    return lastDotIndex > 0 ? fileName.substring(lastDotIndex + 1).toLowerCase() : ''
  }

  /**
   * 辅助方法：根据扩展名获取 MIME 类型
   */
  protected getMimeTypeFromExtension(fileName: string): string {
    const extension = this.getFileExtension(fileName)
    const mimeTypeMap: { [key: string]: string } = {
      // 图片
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'bmp': 'image/bmp',
      'ico': 'image/x-icon',

      // 视频
      'mp4': 'video/mp4',
      'avi': 'video/x-msvideo',
      'mov': 'video/quicktime',
      'wmv': 'video/x-ms-wmv',
      'flv': 'video/x-flv',
      'webm': 'video/webm',
      'mkv': 'video/x-matroska',

      // 音频
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'flac': 'audio/flac',
      'aac': 'audio/aac',
      'ogg': 'audio/ogg',

      // 文档
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

      // 文本
      'txt': 'text/plain',
      'json': 'application/json',
      'xml': 'application/xml',
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'ts': 'application/typescript',

      // 压缩文件
      'zip': 'application/zip',
      'rar': 'application/x-rar-compressed',
      '7z': 'application/x-7z-compressed',
      'tar': 'application/x-tar',
      'gz': 'application/gzip'
    }

    return mimeTypeMap[extension] || 'application/octet-stream'
  }

  /**
   * 发布HTTP请求事件，供插件系统监听
   */
  protected emitHttpEvent(endpoint: string, type: 'start' | 'success' | 'error', data: any): void {
    try {
      const eventName = `mira_http_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`
      const eventData = {
        endpoint,
        type,
        data,
        timestamp: new Date().toISOString()
      }

      // 发布全局事件，插件可以监听
      const customEvent = new CustomEvent(eventName, {
        detail: eventData
      })
      window.dispatchEvent(customEvent)

      // 也发布通用的HTTP事件
      const genericEvent = new CustomEvent('mira_http_request', {
        detail: eventData
      })
      window.dispatchEvent(genericEvent)

    } catch (error) {
      console.error('Failed to emit HTTP event:', error)
    }
  }
}
