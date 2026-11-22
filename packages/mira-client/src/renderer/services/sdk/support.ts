import { useAuthStore } from '../../stores/auth'
import { useSettingsStore } from '../../stores/settings'
import i18n from '../../i18n'
import type {
  UserInfo,
  SystemInfo,
  PluginInfo,
  BaseResponse
} from '../../../shared/types'

/** 给 HTTP 资源 URL 追加 token 参数（用于 <img>/<video> 等无法设 header 的场景） */
export function appendToken(url: string | undefined): string | undefined {
  if (!url) return url
  if (!url.startsWith('http')) return url
  const token = useAuthStore().token
  if (!token) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}token=${encodeURIComponent(token)}`
}

export function notifyDuplicateUpload(fileName: string): void {
  const settings = useSettingsStore().settings
  if (!settings.enableNotifications || !settings.enableImportNotifications) return

  window.electronAPI?.notificationWindow?.show({
    title: i18n.global.t('services.sdkService.duplicateUploadTitle'),
    body: i18n.global.t('services.sdkService.duplicateUploadBody', { name: fileName }),
    type: 'warning',
    icon: 'content_copy',
    duration: 6000,
  }).catch((err: Error) => {
    console.warn('Failed to show duplicate upload notification:', err.message)
  })
}

/**
 * 类型转换适配器
 */
export class TypeAdapter {
  static convertUserInfo(sdkUser: any): UserInfo {
    return {
      id: sdkUser?.id?.toString() || 'unknown',
      username: sdkUser?.username || 'unknown',
      realName: sdkUser?.realName,
      email: sdkUser?.email,
      avatar: sdkUser?.avatar,
      role: sdkUser?.role
    }
  }

  static convertSystemInfo(sdkInfo: any): SystemInfo {
    return {
      version: sdkInfo?.version || '1.0.0',
      platform: sdkInfo?.platform || (typeof window !== 'undefined' ? 'web' : 'unknown'),
      arch: sdkInfo?.arch || 'unknown',
      nodeVersion: sdkInfo?.nodeVersion || 'unknown',
      uptime: sdkInfo?.uptime || 0,
      memory: {
        total: sdkInfo?.memory?.total || 8000000000,
        used: sdkInfo?.memory?.used || 4000000000,
        available: sdkInfo?.memory?.available || 4000000000
      },
      disk: {
        total: 500000000000,
        used: 250000000000,
        available: 250000000000
      }
    }
  }

  static convertPluginInfo(sdkPlugin: any): PluginInfo {
    return {
      id: sdkPlugin?.id || 'unknown',
      name: sdkPlugin?.name || 'Unknown Plugin',
      version: sdkPlugin?.version || '1.0.0',
      description: sdkPlugin?.description,
      longDescription: sdkPlugin?.longDescription,
      author: sdkPlugin?.author,
      homepage: sdkPlugin?.homepage,
      installed: true, // 假设从 getAll 返回的都是已安装的
      enabled: sdkPlugin?.enabled !== false,
      installedAt: sdkPlugin?.installedAt,
      category: sdkPlugin?.category,
      tags: sdkPlugin?.tags,
      image: sdkPlugin?.image,
      rating: sdkPlugin?.rating,
      downloads: sdkPlugin?.downloads,
      fileSize: sdkPlugin?.fileSize,
      features: sdkPlugin?.features,
      requirements: sdkPlugin?.requirements,
      changelog: sdkPlugin?.changelog,
      screenshots: sdkPlugin?.screenshots
    }
  }

  static normalizeBaseResponse(sdkResponse: any): BaseResponse {
    return {
      success: sdkResponse?.success !== false,
      message: sdkResponse?.message || 'Operation completed',
      data: sdkResponse?.data
    }
  }
}
