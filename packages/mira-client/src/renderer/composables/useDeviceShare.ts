import { ref } from 'vue'
import { toast } from 'vue-sonner'
import type { Device } from 'mira-app-core/shared/sdk'
import type { FileInfo } from '../../shared/types'
import i18n from '../i18n'
import { appService } from '../services'
import { miraSDKService } from '../services/MiraSDKService'
import { webSocketService } from '../services/WebSocketService'
import { useAuthStore } from '../stores/auth'
import { useLibraryStore } from '../stores/library'
import { useSettingsStore } from '../stores/settings'
import { receiveShareFiles } from '../components/business/DeviceShareDialog/downloadShare'
import { shareDialogTab } from '../components/business/DeviceShareDialog/useDeviceTransfers'

/** 分享消息中的单个文件（库内文件传 HTTP 直链；本地文件 binary=true 走 WS 二进制流） */
export interface DeviceShareFile {
  id: string
  name: string
  /** 相对库根路径，供多文件时服务端 ZIP 打包（POST /api/fs/download）使用 */
  path?: string
  size?: number
  /** 单文件下载直链（含 token） */
  url: string
  /** 缩略图地址（thumbnailPath）：发送端 Dropzone 列表作小图预览，避免直链加载原图 */
  thumb?: string
  /** 本地文件（Dropzone 选择）：无 url 内容，由发送端 WS 二进制推流 */
  binary?: boolean
}

/** 通过 devices().sendMessage 发送的设备间分享消息体 */
export interface DeviceShareMessage {
  type: 'mira-share'
  /** 本次分享的唯一标识：接收端回传进度（mira-share-ack）时关联用 */
  id?: string
  from: string
  fromLabel?: string
  libraryId: string
  files: DeviceShareFile[]
  /** 一次性分享票据下载链（免 token，多文件为 ZIP）：优先于逐文件直链 */
  ticketUrl?: string
  /** 含本地文件二进制推流：接收端确认后发送端开始推 WS 二进制帧 */
  binary?: boolean
}

/** 接收端确认接收二进制分享（发送端收到后开始推流） */
export interface DeviceShareAccept {
  type: 'mira-share-accept'
  shareId: string
}

/** 接收端向发送端回传的进度/状态消息体 */
export interface DeviceShareAck {
  type: 'mira-share-ack'
  /** 关联的 DeviceShareMessage.id */
  shareId: string
  state: 'receiving' | 'done' | 'failed' | 'declined'
  /** 对端下载进度 0-1 */
  percent?: number
  /** URL/票据部分（素材文件）的接收进度 0-1：发送端按文件大小比例映射出单文件状态 */
  urlPercent?: number
}

/** 生成分享消息 id（发送端调用，ack 关联用） */
export function createShareId(): string {
  return `share_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/** 各 shareId 最近一次已发送的进度（receiving 节流用，变化 <5% 不重发） */
const ackLastSentPercent = new Map<string, number>()

/** 接收端回传接收进度/状态给发送端（失败静默，进度回调不影响下载流程） */
export function sendShareAck(
  toClientId: string | undefined,
  shareId: string | undefined,
  state: DeviceShareAck['state'],
  percent = 0,
  extra?: { urlPercent?: number },
): void {
  const client = (miraSDKService as any).client as any
  if (!client || !toClientId || !shareId) return
  if (state === 'receiving') {
    const last = ackLastSentPercent.get(shareId) ?? -1
    if (percent - last < 0.05 && percent < 1) return
    ackLastSentPercent.set(shareId, percent)
  } else {
    ackLastSentPercent.delete(shareId)
  }
  const libraryId = useLibraryStore().currentLibrary?.id || 'default'
  void client.devices().sendMessage(toClientId, libraryId, {
    type: 'mira-share-ack',
    shareId,
    state,
    percent,
    ...(extra?.urlPercent !== undefined ? { urlPercent: extra.urlPercent } : {}),
  } satisfies DeviceShareAck).catch(() => {})
}

// 模块级全局状态：发送对话框与接收对话框共享（HomeDialogs 挂载，任意组件触发）
export const shareDialogOpen = ref(false)
export const shareFiles = ref<DeviceShareFile[]>([])
export const incomingShare = ref<DeviceShareMessage | null>(null)

/** 从 FileInfo 的 path/url（形如 http://server/api/files/file/<libId>/<rel>）提取库内相对路径 */
function extractRelativePath(value: string | undefined, libraryId: string): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value, location.href)
    const prefix = `/api/files/file/${libraryId}/`
    if (url.pathname.startsWith(prefix)) {
      return decodeURIComponent(url.pathname.slice(prefix.length))
    }
    // 非完整 URL 时直接当相对路径
    if (!/^https?:\/\//.test(value)) return value.replace(/^\/+/, '')
  } catch {
    if (!/^https?:\/\//.test(value)) return value.replace(/^\/+/, '')
  }
  return undefined
}

/** 构造带 token 的单文件下载直链 */
export function buildFileDownloadUrl(libraryId: string, fileId: string): string | null {
  const config = miraSDKService.getConnectionConfig()
  if (!config?.serverUrl) return null
  const base = config.serverUrl.replace(/\/+$/, '')
  const token = useAuthStore().token
  return `${base}/api/files/file/${encodeURIComponent(libraryId)}/${encodeURIComponent(fileId)}${token ? `?token=${encodeURIComponent(token)}` : ''}`
}

/** 把当前素材的 FileInfo 列表转成可发送的分享文件列表 */
export function toDeviceShareFiles(items: FileInfo[]): DeviceShareFile[] {
  const libraryId = items[0]?.libraryId || useLibraryStore().currentLibrary?.id || 'default'
  return items
    .map((item): DeviceShareFile | null => {
      const url = buildFileDownloadUrl(item.libraryId || libraryId, String(item.id))
      if (!url) return null
      const file: DeviceShareFile = {
        id: String(item.id),
        name: item.name || `${item.id}`,
        path: extractRelativePath(item.path || item.url, item.libraryId || libraryId),
        size: item.size,
        url,
        thumb: item.thumbnailPath,
      }
      return file
    })
    .filter((f): f is DeviceShareFile => f !== null)
}

/** 打开「发送到其他设备」对话框（useContextMenu / 浮动工具栏调用）；默认停在发送页签 */
export function openDeviceShare(items: FileInfo[]): void {
  const files = toDeviceShareFiles(items)
  if (files.length === 0) return
  shareFiles.value = files
  shareDialogTab.value = 'send'
  shareDialogOpen.value = true
}

/** 收到其他设备的分享请求（WebSocketService 收到 admin_message 后调用）；开启自动接收时直接下载不弹确认框 */
export function pushIncomingShare(message: DeviceShareMessage): void {
  if (useSettingsStore().settings.deviceShareAutoAccept) {
    void autoAcceptShare(message)
    return
  }
  incomingShare.value = message
}

/** 自动接收：用设置中的保存位置直接下载；失败回落到确认框人工处理 */
async function autoAcceptShare(message: DeviceShareMessage): Promise<void> {
  const { settings } = useSettingsStore()
  const t = i18n.global.t
  const from = message.fromLabel || message.from || ''
  const toastId = toast.loading(t('business.deviceShare.autoAccepting', { from, count: message.files?.length || 0 }))
  try {
    const saved = await receiveShareFiles(message, {
      saveDir: settings.deviceShareSaveDir || undefined,
      onProgress: (p, urlPercent) => sendShareAck(message.from, message.id, 'receiving', p, { urlPercent }),
    })
    sendShareAck(message.from, message.id, 'done', 1)
    toast.success(t('business.deviceShare.downloadDone', { count: saved.length }), {
      id: toastId,
      description: appService.isElectron && settings.deviceShareSaveDir ? saved[0] : undefined,
    })
  } catch (e) {
    console.error('[device-share] auto accept failed', e)
    sendShareAck(message.from, message.id, 'failed')
    toast.error(t('business.deviceShare.downloadFailed'), {
      id: toastId,
      description: e instanceof Error ? e.message : String(e),
    })
    incomingShare.value = message
  }
}

/** 简易设备描述：userAgent + IP 推断展示名 */
export function describeDevice(device: Pick<Device, 'userAgent' | 'ipAddress'>): string {
  const ua = device.userAgent || ''
  let platform = '浏览器'
  if (/Electron/i.test(ua)) platform = 'Mira 桌面端'
  else if (/Android/i.test(ua)) platform = 'Android'
  else if (/iPhone|iPad/i.test(ua)) platform = 'iOS'
  else if (/Windows/i.test(ua)) platform = 'Windows'
  else if (/Mac OS/i.test(ua)) platform = 'macOS'
  const ip = (device.ipAddress || '').replace(/^::ffff:/, '')
  return ip && ip !== 'Unknown' ? `${platform} · ${ip}` : platform
}

/** 当前客户端自身设备标识（用于从设备列表中排除自己） */
export function getSelfClientId(): string | undefined {
  return webSocketService.getClientId()
}

/**
 * 构造静态配对页 URL（QR 码内容）。
 * 优先使用页面实际访问主机（局域网 IP），保证扫码设备可达；
 * electron / dev 场景回退 serverUrl。WS 地址同步替换主机。
 */
export function buildPairUrl(): { pageUrl: string; wsUrl: string } | null {
  const config = miraSDKService.getConnectionConfig()
  if (!config?.serverUrl) return null

  let serverOrigin: string
  try {
    serverOrigin = new URL(config.serverUrl).origin
  } catch {
    return null
  }

  // 页面从服务器本身加载（web 版）时用当前访问主机，扫码后才可达
  const pageOrigin = location.origin === serverOrigin ? location.origin : serverOrigin
  const isLoopback = (h: string) => /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(h)
  const hostCandidates = [new URL(pageOrigin).hostname, new URL(serverOrigin).hostname]
  const lanHost = hostCandidates.find((h) => h && !isLoopback(h)) || hostCandidates[0]

  let wsUrl = config.websocketUrl || ''
  if (wsUrl) {
    try {
      const parsed = new URL(wsUrl)
      parsed.hostname = lanHost
      wsUrl = parsed.toString().replace(/\/+$/, '')
    } catch { /* 保留原始值 */ }
  }

  const token = useAuthStore().token
  const libraryId = useLibraryStore().currentLibrary?.id || 'default'
  const query = new URLSearchParams({
    token: token || '',
    libraryId,
    ...(wsUrl ? { ws: wsUrl } : {}),
    // 发起配对的桌面端 clientId：配对页反向发送文件时作为推送目标
    ...(getSelfClientId() ? { from: getSelfClientId()! } : {}),
  })
  return {
    pageUrl: `${pageOrigin.replace(/\/+$/, '')}/static/pair.html?${query.toString()}`,
    wsUrl,
  }
}

/** 对外可达的服务器 origin（与配对 QR 一致，优先局域网主机），用于拼接分享票据等跨设备链接 */
export function resolveServerOrigin(): string | null {
  const pair = buildPairUrl()
  if (pair) {
    try {
      return new URL(pair.pageUrl).origin
    } catch { /* fallthrough */ }
  }
  const base = miraSDKService.getConnectionConfig()?.serverUrl
  return base ? base.replace(/\/+$/, '') : null
}
