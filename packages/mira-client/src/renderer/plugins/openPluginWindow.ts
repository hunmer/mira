import type { PluginWindowOpenOptions } from '../../shared/types'
import i18n from '../i18n'
import { miraSDKService } from '../services/MiraSDKService'
import { useAuthStore } from '../stores/auth'
import { useToast } from '../composables/useToast'
import { getPluginDevConfig, isPluginDevEnabled } from './devMode'

const t = i18n.global.t.bind(i18n.global)

export interface OpenPluginWindowResult {
  success: boolean
  windowId?: string
  data?: { url?: string }
  message?: string
}

/**
 * dev 模式下打开自定义 url 的插件窗口。
 * 返回是否已处理：true 表示该插件 dev 已开启（窗口已打开或已报错提示），
 * 调用方应中止后续正常打开流程。
 */
export async function openPluginDevWindow(target: { pluginId: string; title?: string }): Promise<boolean> {
  if (!isPluginDevEnabled(target.pluginId)) return false
  const result = await openPluginWindow({
    pluginId: target.pluginId,
    title: `${target.title || target.pluginId} (dev)`,
  })
  if (result?.success === false) {
    useToast().add({
      severity: 'error',
      summary: t('views.pluginContributionBar.windowOpenFailed'),
      detail: result.message || t('views.common.unknownError'),
      life: 5000,
    })
  }
  return true
}

/**
 * 解析服务端插件入口地址。
 * 服务端清单可能返回绝对 URL，也可能返回相对的 /server-plugins 路径。
 */
export function resolveServerPluginUrl(
  config: { url?: string; serverPluginName?: string },
  entry = 'dist/index.html',
  serverOrigin?: string,
): string | undefined {
  const base = String(config.url || '').replace(/\/+$/, '')
  const pluginName = encodeURIComponent(config.serverPluginName || '')
  if (!base || !pluginName) return undefined

  try {
    const origin = serverOrigin || miraSDKService.getConnectionConfig()?.serverUrl
      || (typeof window !== 'undefined' ? window.location.origin : undefined)
    const absoluteBase = /^https?:\/\//i.test(base)
      ? base
      : origin
        ? new URL(base, `${origin.replace(/\/+$/, '')}/`).toString().replace(/\/+$/, '')
        : base
    const normalizedBase = absoluteBase.endsWith(`/${pluginName}`) || absoluteBase.endsWith(`/${config.serverPluginName}`)
      ? absoluteBase
      : `${absoluteBase}/${pluginName}`
    const resolved = new URL(`${normalizedBase}/${String(entry).replace(/^\/+/, '')}`,
      typeof window !== 'undefined' ? window.location.origin : undefined)
    return ['http:', 'https:'].includes(resolved.protocol) ? resolved.toString() : undefined
  } catch {
    return undefined
  }
}

/**
 * 打开插件窗口的公共实现（PluginService 与 PluginContributionBar 共用）：
 *   - 自动向 query 注入当前素材库连接信息（server + token），插件网页
 *     （如自由画板的素材库浏览器）需要直连 server API；
 *   - Electron 环境走 electronAPI.pluginWindow.open（独立 BrowserWindow，
 *     加载插件本地 dist；url 字段优先，供服务端 Web 插件指向远程入口）；
 *   - Web 环境回退 window.open 打开插件在线地址（webBaseUrl，缺失则失败）。
 */
export async function openPluginWindow(
  opts: PluginWindowOpenOptions,
  extra: { webBaseUrl?: string } = {},
): Promise<OpenPluginWindowResult> {
  // 插件 dev 模式统一拦截：该插件 dev 开启后，任何路径（图标点击、右键菜单调用插件、
  // PluginService ctx.openPluginWindow 等）打开的窗口都改指 dev url，
  // 原 query（media/server/token 等）由主进程拼到 dev url 上。
  if (!opts.dev && isPluginDevEnabled(opts.pluginId)) {
    const devUrl = getPluginDevConfig(opts.pluginId)!.url.trim()
    opts = { ...opts, url: devUrl, dev: true }
  }
  const serverUrl = miraSDKService.getConnectionConfig()?.serverUrl
  const token = useAuthStore().token
  const finalOpts = {
    entry: 'dist/index.html',
    ...opts,
    query: {
      ...opts.query,
      ...(serverUrl ? { server: serverUrl } : {}),
      ...(token ? { token } : {}),
    },
  }

  const w: any = typeof window !== 'undefined' ? (window as any).electronAPI : undefined
  if (w?.pluginWindow?.open) {
    try {
      return await w.pluginWindow.open(finalOpts)
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error(`[openPluginWindow] open failed for ${opts.pluginId}:`, error)
      return { success: false, message: msg }
    }
  }

  // Web 环境：打开插件在线地址
  const base = extra.webBaseUrl
  if (!base || typeof window === 'undefined') {
    return { success: false, message: t('services.plugin.pluginUrlUnavailable') }
  }
  try {
    const entry = String(finalOpts.entry || 'dist/index.html').replace(/^\/+/, '')
    const url = new URL(`${String(base).replace(/\/+$/, '')}/${entry}`)
    Object.entries(finalOpts.query || {}).forEach(([key, value]) => {
      url.searchParams.set(key, String(value))
    })
    const features = [
      finalOpts.width && `width=${finalOpts.width}`,
      finalOpts.height && `height=${finalOpts.height}`,
    ].filter(Boolean).join(',')
    const opened = window.open(url.href, '_blank', features || undefined)
    return opened
      ? { success: true, data: { url: url.href } }
      : { success: false, message: t('services.plugin.popupBlocked') }
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : String(error) }
  }
}
