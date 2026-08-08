import { ref } from 'vue'
import { useLibraryStore } from '../stores/library'
import { useAuthStore } from '../stores/auth'
import { useSettingsStore } from '../stores/settings'
import { useTabs } from '../composables/useTabs'
import ConfigStorage from '../utils/ConfigStorage'
import { toFileUrl } from '../utils/fileUtils'

export interface WebSocketEventData {
  eventName: string
  data: Record<string, any>
}

export interface WebSocketConfig {
  url: string
  clientId: string
  libraryId: string
}

class WebSocketService {
  private ws: WebSocket | null = null
  private config: WebSocketConfig | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private eventListeners: Map<string, Array<(data: any) => void>> = new Map()
  private fields: Record<string, any> = {}
  private readonly fieldsStoragePrefix = 'mira_ws_fields'

  // 心跳
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private heartbeatTimeoutTimer: ReturnType<typeof setTimeout> | null = null
  private readonly HEARTBEAT_INTERVAL = 30000 // 30s 发一次 ping
  private readonly HEARTBEAT_TIMEOUT = 10000  // 10s 没收到 pong 认为断开

  // 响应式状态
  public isConnected = ref(false)
  public isConnecting = ref(false)
  public lastError = ref<string | null>(null)

  /**
   * 连接到WebSocket服务器
   */
  async connect(config: WebSocketConfig): Promise<boolean> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      if (this.isSameConfig(config)) {
        console.log('WebSocket already connected')
        return true
      }

      this.disconnect()
    }

    if (!this.config || this.config.url !== config.url || this.config.libraryId !== config.libraryId) {
      this.fields = await this.loadFields(config)
    }

    this.config = config
    this.isConnecting.value = true
    this.lastError.value = null

    try {
      const token = useAuthStore().token
      const wsUrl = `${config.url}?clientId=${config.clientId}&libraryId=${config.libraryId}${token ? `&token=${token}` : ''}`
      console.log('Connecting to WebSocket:', wsUrl)
      
      this.ws = new WebSocket(wsUrl)
      
      this.ws.onopen = this.handleOpen.bind(this)
      this.ws.onmessage = this.handleMessage.bind(this)
      this.ws.onclose = this.handleClose.bind(this)
      this.ws.onerror = this.handleError.bind(this)

      // 等待连接建立
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve(false)
        }, 10000) // 10秒超时

        this.ws!.onopen = () => {
          clearTimeout(timeout)
          this.handleOpen()
          resolve(true)
        }

        this.ws!.onerror = () => {
          clearTimeout(timeout)
          resolve(false)
        }
      })
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      this.isConnecting.value = false
      this.lastError.value = error instanceof Error ? error.message : 'Connection failed'
      return false
    }
  }

  /**
   * 断开WebSocket连接
   */
  disconnect(): void {
    this.stopHeartbeat()
    if (this.ws) {
      this.ws.close(1000, 'manual disconnect')
      this.ws = null
    }
    this.isConnected.value = false
    this.isConnecting.value = false
    this.reconnectAttempts = 0
  }

  /**
   * 发送消息到WebSocket服务器
   */
  send(message: any): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket is not connected')
      return false
    }

    try {
      this.ws.send(JSON.stringify(message))
      return true
    } catch (error) {
      console.error('Failed to send WebSocket message:', error)
      return false
    }
  }

  getClientId(): string | undefined {
    return this.config?.clientId
  }

  /**
   * 添加事件监听器
   */
  addEventListener(eventName: string, callback: (data: any) => void): void {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, [])
    }
    this.eventListeners.get(eventName)!.push(callback)
  }

  /**
   * 移除事件监听器
   */
  removeEventListener(eventName: string, callback: (data: any) => void): void {
    const listeners = this.eventListeners.get(eventName)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  /**
   * 移除所有事件监听器
   */
  removeAllEventListeners(): void {
    this.eventListeners.clear()
  }

  private handleOpen(): void {
    console.log('WebSocket connected successfully')
    this.isConnected.value = true
    this.isConnecting.value = false
    this.reconnectAttempts = 0
    this.lastError.value = null
    this.startHeartbeat()
    this.openLibrarySession()
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data)
      console.log('WebSocket message received:', data)
      this.handleInternalEvent(data)

      // 触发相应的事件监听器
      if (data.eventName) {
        const listeners = this.eventListeners.get(data.eventName)
        if (listeners) {
          listeners.forEach(callback => {
            try {
              callback(data.data || data)
            } catch (error) {
              console.error('Error in WebSocket event listener:', error)
            }
          })
        }
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error)
    }
  }

  private handleInternalEvent(message: any): void {
    switch (message.eventName) {
      case 'pong':
        this.onPongReceived()
        break
      case 'try_connect':
        this.connectLibrarySession()
        break
      case 'setFields':
        this.updateFields(message.data?.fields)
        break
      case 'dialog':
        this.openDialog(message.data)
        break
    }
  }

  private openLibrarySession(): void {
    this.sendLibraryMessage('open', {})
  }

  private connectLibrarySession(): void {
    this.sendLibraryMessage('connect', this.fields)
  }

  private sendLibraryMessage(action: 'open' | 'connect', fields: Record<string, any>): void {
    if (!this.config) return

    this.send({
      action,
      requestId: this.createRequestId(action),
      libraryId: this.config.libraryId,
      clientId: this.config.clientId,
      fields,
      payload: {
        type: 'library',
        data: { fields }
      }
    })
  }

  private updateFields(fields?: Record<string, any>): void {
    if (!fields) return

    for (const [key, value] of Object.entries(fields)) {
      if (value === null || value === undefined) {
        delete this.fields[key]
      } else {
        this.fields[key] = value
      }
    }

    void this.saveFields()
  }

  private openDialog(data?: { url?: string }): void {
    if (!data?.url) return
    window.open(data.url, '_blank')
  }

  private createRequestId(action: string): string {
    return `ws_${action}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  }

  private async loadFields(config: WebSocketConfig): Promise<Record<string, any>> {
    try {
      const savedFields = await ConfigStorage.getItem(this.getFieldsStorageKey(config))
      return savedFields ? JSON.parse(savedFields) : {}
    } catch (error) {
      console.warn('Failed to load WebSocket fields:', error)
      return {}
    }
  }

  private async saveFields(): Promise<void> {
    if (!this.config) return

    try {
      await ConfigStorage.setItem(this.getFieldsStorageKey(this.config), JSON.stringify(this.fields))
    } catch (error) {
      console.warn('Failed to save WebSocket fields:', error)
    }
  }

  private getFieldsStorageKey(config: WebSocketConfig): string {
    return `${this.fieldsStoragePrefix}_${config.url}_${config.libraryId}`
  }

  private isSameConfig(config: WebSocketConfig): boolean {
    return (
      this.config?.url === config.url &&
      this.config?.libraryId === config.libraryId &&
      this.config?.clientId === config.clientId
    )
  }

  private handleClose(event: CloseEvent): void {
    console.log('WebSocket connection closed:', event.code, event.reason)
    this.isConnected.value = false
    this.isConnecting.value = false
    this.stopHeartbeat()

    // 如果不是主动关闭，尝试重连
    if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
      useSettingsStore().setConnectionStatus('reconnecting')
      this.attemptReconnect()
    } else {
      useSettingsStore().setConnectionStatus('disconnected')
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ eventName: 'ping' }))
        this.heartbeatTimeoutTimer = setTimeout(() => {
          console.warn('WebSocket heartbeat timeout, closing connection')
          this.ws?.close(4000, 'heartbeat timeout')
        }, this.HEARTBEAT_TIMEOUT)
      }
    }, this.HEARTBEAT_INTERVAL)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer)
      this.heartbeatTimeoutTimer = null
    }
  }

  private onPongReceived(): void {
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer)
      this.heartbeatTimeoutTimer = null
    }
  }

  private handleError(event: Event): void {
    console.error('WebSocket error:', event)
    this.lastError.value = 'WebSocket connection error'
    this.isConnecting.value = false
  }

  private attemptReconnect(): void {
    if (!this.config) return

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    
    console.log(`Attempting to reconnect WebSocket (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`)
    
    setTimeout(() => {
      if (this.config) {
        this.connect(this.config)
      }
    }, delay)
  }
}

// 创建单例实例
export const webSocketService = new WebSocketService()

/**
 * 初始化WebSocket连接并设置事件监听
 */
export async function initializeWebSocket(config: WebSocketConfig): Promise<boolean> {
  const libraryStore = useLibraryStore()

  // 连接WebSocket
  const connected = await webSocketService.connect(config)
  
  if (!connected) {
    console.error('Failed to connect to WebSocket')
    return false
  }

  // 设置事件监听器
  setupEventListeners(libraryStore)
  
  return true
}

/**
 * 显示桌面通知
 */
function showDesktopNotification(title: string, body?: string): void {
  const settingsStore = useSettingsStore()
  if (!settingsStore.settings.enableNotifications) return

  window.electronAPI?.notification.show({
    title,
    body: body || '',
    silent: false,
  }).catch((err: Error) => {
    console.warn('Failed to show notification:', err.message)
  })
}

/**
 * 给 http(s) 缩略图 URL 追加鉴权 token（与 MiraSDKService.appendToken 一致），
 * file:// / data: 等本地资源不加 token。
 */
function appendThumbToken(url: string | undefined): string | undefined {
  if (!url) return url
  if (!/^https?:/i.test(url)) return url
  if (/[?&]token=/i.test(url)) return url
  const token = useAuthStore().token
  if (!token) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}token=${encodeURIComponent(token)}`
}

/**
 * 导入文件通知：聚合短时间内（800ms）的 file::created 事件为一条通知，
 * 避免批量导入时弹出大量通知。
 * 使用自定义通知窗口（notificationWindow），支持富样式、缩略图、操作按钮，而非系统原生通知。
 */
let importNotifyTimer: ReturnType<typeof setTimeout> | null = null
let importNotifyCount = 0
let importNotifyLastName = ''
let importNotifyLastThumb = ''
let importNotifyThumbs: string[] = []
let importNotifyLastFileId: string | undefined
let importNotifyLastPreviewType: 'image' | 'video' = 'image'
// 是否已展示（避免缩略图到达后重复展示）
let importNotifyShown = false
// 缩略图就绪前的最长等待时间（ms）：超时则用 Material Icon 兜底展示
const IMPORT_THUMB_WAIT = 1500

function doShowImportNotification(): void {
  if (importNotifyShown) return
  importNotifyShown = true

  const count = importNotifyCount
  const name = importNotifyLastName
  const thumb = importNotifyLastThumb
  const fileIdResolved = importNotifyLastFileId

  const title = count > 1 ? `已导入 ${count} 个文件` : '文件导入完成'
  const body = count > 1
    ? (name ? `最后导入：${name}` : '批量导入完成')
    : (name || '新文件已添加到媒体库')

  // 使用自定义通知窗口（桌面右下角悬浮卡片）。
  // icon 优先用最后一个文件的缩略图（URL），无缩略图则回退 Material Icon。
  // data.fileId 用于点击/操作时跳转图片详情。
  window.electronAPI?.notificationWindow?.show({
    title,
    body,
    type: 'success',
    icon: thumb || 'file_download_done',
    icons: importNotifyThumbs,
    duration: 6000,
    actions: [{ id: 'view', label: '查看' }],
    data: fileIdResolved
      ? { fileId: fileIdResolved, count, previewType: importNotifyLastPreviewType }
      : undefined,
  }).catch((err: Error) => {
    console.warn('Failed to show import notification window:', err.message)
  })
}

function notifyFileImported(
  fileName?: string,
  thumbRaw?: string,
  fileId?: string | number,
  mimeType?: string
): void {
  const settingsStore = useSettingsStore()
  // 受主通知开关 + 导入文件通知开关共同控制
  if (!settingsStore.settings.enableNotifications) return
  if (!settingsStore.settings.enableImportNotifications) return

  // 上一批已展示完毕，开始新一批：重置聚合状态
  if (importNotifyShown) {
    importNotifyShown = false
    importNotifyCount = 0
    importNotifyLastName = ''
    importNotifyLastThumb = ''
    importNotifyThumbs = []
    importNotifyLastFileId = undefined
    importNotifyLastPreviewType = 'image'
  }

  importNotifyCount += 1
  if (fileName) importNotifyLastName = fileName
  if (fileId !== undefined && fileId !== null) importNotifyLastFileId = String(fileId)
  const normalizedType = mimeType?.toLowerCase()
  const isVideo = normalizedType === 'video'
    || normalizedType?.startsWith('video/')
    || /\.(mp4|webm|avi|mov|wmv|flv|mkv|3gp)$/i.test(fileName || '')
  importNotifyLastPreviewType = isVideo ? 'video' : 'image'
  // 解析缩略图：本地路径转 file://，http 加 token
  const resolved = appendThumbToken(toFileUrl(thumbRaw))
  if (resolved) {
    importNotifyLastThumb = resolved
    if (!importNotifyThumbs.includes(resolved)) importNotifyThumbs.push(resolved)
  }

  // 聚合窗口内的事件；首条事件后等待最多 IMPORT_THUMB_WAIT 让缩略图就绪，
  // 缩略图到达（updateImportThumbIfPending）则立即展示，否则超时兜底展示。
  if (importNotifyTimer) clearTimeout(importNotifyTimer)
  importNotifyTimer = setTimeout(() => {
    importNotifyTimer = null
    doShowImportNotification()
  }, IMPORT_THUMB_WAIT)
}

/**
 * 缩略图就绪回调：若导入通知尚未展示且匹配最后导入文件，填入缩略图并立即展示。
 * 缩略图通常在 file::created 之后异步生成（thumbnail::generated 事件），
 * 这样可保证展示时带上缩略图，且只展示一次。
 */
function updateImportThumbIfPending(fileId: string | number, thumbRaw?: string): void {
  if (importNotifyShown) return
  if (!importNotifyLastFileId || String(fileId) !== importNotifyLastFileId) return
  const thumb = appendThumbToken(toFileUrl(thumbRaw))
  if (!thumb) return
  importNotifyLastThumb = thumb
  if (!importNotifyThumbs.includes(thumb)) importNotifyThumbs.push(thumb)
  // 缩略图已就绪，立即展示（取消等待定时器）
  if (importNotifyTimer) {
    clearTimeout(importNotifyTimer)
    importNotifyTimer = null
  }
  doShowImportNotification()
}

type EagleImportStatus = 'preparing' | 'success' | 'failed'

interface EagleImportGroup {
  displayId: string
  states: Map<string, EagleImportStatus>
  names: Map<string, string>
  thumbs: string[]
  lastFileId?: string
  lastPreviewType: 'image' | 'video'
  failureMessage?: string
}

const EAGLE_IMPORT_BATCH_WINDOW = 800
let activeEagleImportGroup: EagleImportGroup | null = null
let eagleImportBatchTimer: ReturnType<typeof setTimeout> | null = null
const eagleImportGroupsById = new Map<string, EagleImportGroup>()
const eagleImportGroupsByFileId = new Map<string, EagleImportGroup>()

function importNotificationsEnabled(): boolean {
  const settingsStore = useSettingsStore()
  return settingsStore.settings.enableNotifications
    && settingsStore.settings.enableImportNotifications
}

function resolvePreviewType(fileName?: string, mimeType?: string): 'image' | 'video' {
  const normalizedType = mimeType?.toLowerCase()
  return normalizedType === 'video'
    || normalizedType?.startsWith('video/')
    || /\.(mp4|webm|avi|mov|wmv|flv|mkv|3gp)$/i.test(fileName || '')
    ? 'video'
    : 'image'
}

function addEagleImportThumb(group: EagleImportGroup, thumbRaw?: string): void {
  const thumb = appendThumbToken(toFileUrl(thumbRaw))
  if (thumb && !group.thumbs.includes(thumb)) group.thumbs.push(thumb)
}

function showEagleImportGroup(group: EagleImportGroup): void {
  if (!importNotificationsEnabled()) return

  const states = [...group.states.values()]
  const total = states.length
  const preparing = states.filter((status) => status === 'preparing').length
  const succeeded = states.filter((status) => status === 'success').length
  const failed = states.filter((status) => status === 'failed').length
  const lastName = [...group.names.values()].at(-1)
  const complete = preparing === 0
  let title = total > 1 ? `正在导入 ${total} 个文件` : '正在下载图片'
  let body = lastName || '正在准备图片'
  let type: 'info' | 'success' | 'warning' | 'error' = 'info'
  let icon = group.thumbs.at(-1) || 'downloading'

  if (complete && failed === 0) {
    title = total > 1 ? `已导入 ${total} 个文件` : '文件导入完成'
    body = lastName || '图片已添加到媒体库'
    type = 'success'
    icon = group.thumbs.at(-1) || 'file_download_done'
  } else if (complete && succeeded === 0) {
    title = total > 1 ? `${failed} 个文件导入失败` : '图片下载失败'
    body = group.failureMessage || lastName || '未能下载图片'
    type = 'error'
    icon = 'error'
  } else if (complete) {
    title = `已导入 ${succeeded} 个，${failed} 个失败`
    body = group.failureMessage || lastName || '部分图片未能下载'
    type = 'warning'
    icon = group.thumbs.at(-1) || 'warning'
  } else if (failed > 0) {
    body = `已完成 ${succeeded} 个，失败 ${failed} 个，剩余 ${preparing} 个`
    type = 'warning'
  }

  window.electronAPI?.notificationWindow?.show({
    notificationId: group.displayId,
    title,
    body,
    type,
    icon,
    icons: group.thumbs,
    duration: complete ? 60000 : 0,
    actions: succeeded > 0 ? [{ id: 'view', label: '查看' }] : [],
    data: group.lastFileId
      ? { fileId: group.lastFileId, count: total, previewType: group.lastPreviewType }
      : undefined,
  }).catch((err: Error) => {
    console.warn('Failed to update Eagle import notification:', err.message)
  })
}

function prepareEagleImportNotification(data: any): void {
  if (!importNotificationsEnabled() || !data?.id) return
  const id = String(data.id)
  let group = activeEagleImportGroup
  if (!group) {
    group = {
      displayId: id,
      states: new Map(),
      names: new Map(),
      thumbs: [],
      lastPreviewType: 'image',
    }
    activeEagleImportGroup = group
  }
  group.states.set(id, 'preparing')
  if (data.name) group.names.set(id, String(data.name))
  eagleImportGroupsById.set(id, group)

  if (eagleImportBatchTimer) clearTimeout(eagleImportBatchTimer)
  eagleImportBatchTimer = setTimeout(() => {
    activeEagleImportGroup = null
    eagleImportBatchTimer = null
  }, EAGLE_IMPORT_BATCH_WINDOW)
  showEagleImportGroup(group)
}

function failEagleImportNotification(data: any): void {
  if (!importNotificationsEnabled() || !data?.id) return
  const id = String(data.id)
  const group = eagleImportGroupsById.get(id)
  if (!group) return
  group.states.set(id, 'failed')
  if (data.name) group.names.set(id, String(data.name))
  if (data.message) group.failureMessage = String(data.message)
  showEagleImportGroup(group)
}

function completeEagleImportNotification(data: any): boolean {
  if (!data?.notificationId) return false
  const id = String(data.notificationId)
  const group = eagleImportGroupsById.get(id)
  if (!group) return true

  const fileName = data?.name || data?.title || data?.fileName
  group.states.set(id, data.downloadFailed ? 'failed' : 'success')
  if (fileName) group.names.set(id, String(fileName))
  if (data.downloadFailed) group.failureMessage = '图片下载失败，已保存为 URL 引用'
  if (data.id !== undefined && data.id !== null) {
    group.lastFileId = String(data.id)
    eagleImportGroupsByFileId.set(group.lastFileId, group)
  }
  group.lastPreviewType = resolvePreviewType(fileName, data?.mimeType || data?.mime_type || data?.type)
  addEagleImportThumb(
    group,
    data?.thumb_path || data?.thumbnail_path || (typeof data?.thumb === 'string' ? data.thumb : undefined)
  )
  showEagleImportGroup(group)
  return true
}

/**
 * 设置WebSocket事件监听器
 */
function setupEventListeners(libraryStore: any): void {
  // 监听标签事件
  webSocketService.addEventListener('tag::created', (data) => {
    console.log('Tag created:', data)
    libraryStore.refreshTags?.(data.libraryId)
  })

  webSocketService.addEventListener('tag::updated', (data) => {
    console.log('Tag updated:', data)
    libraryStore.refreshTags?.(data.libraryId)
    if (data.id && data.title) {
      const { tabs } = useTabs()
      const tabId = `tag-${data.id}`
      const tab = tabs.value.find(t => t.id === tabId)
      if (tab) tab.label = data.title
    }
  })

  webSocketService.addEventListener('tag::deleted', (data) => {
    console.log('Tag deleted:', data)
    libraryStore.refreshTags?.(data.libraryId)
  })

  // 监听文件夹事件
  webSocketService.addEventListener('folder::created', (data) => {
    console.log('Folder created:', data)
    libraryStore.refreshFolders?.(data.libraryId)
  })

  webSocketService.addEventListener('folder::updated', (data) => {
    console.log('Folder updated:', data)
    libraryStore.refreshFolders?.(data.libraryId)
    if (data.id && data.title) {
      const { tabs } = useTabs()
      const tabId = `folder-${data.id}`
      const tab = tabs.value.find(t => t.id === tabId)
      if (tab) tab.label = data.title
    }
  })

  webSocketService.addEventListener('folder::deleted', (data) => {
    console.log('Folder deleted:', data)
    libraryStore.refreshFolders?.(data.libraryId)

    // 关闭被删除文件夹对应的 tab
    const { tabs, closeTab } = useTabs()
    const deletedTabId = `folder-${data.id}`
    const tab = tabs.value.find(t => t.id === deletedTabId)
    if (tab) {
      closeTab(deletedTabId)
    }
  })

  // 监听文件事件
  webSocketService.addEventListener('file::created', (data) => {
    console.log('File created:', data)
    handleFileEvent(data, 'created')
    // 导入文件通知（受 enableImportNotifications 控制，批量聚合）。
    // 缩略图可能在 thumb / thumb_path / thumbnail_path 字段（后端广播时已解析为路径/URL）。
    if (!completeEagleImportNotification(data)) {
      notifyFileImported(
        data?.name || data?.title || data?.fileName,
        data?.thumb_path || data?.thumbnail_path || (typeof data?.thumb === 'string' ? data.thumb : undefined),
        data?.id,
        data?.mimeType || data?.mime_type || data?.type
      )
    }
  })

  webSocketService.addEventListener('eagle::import-notification', (data) => {
    console.log('Eagle import notification:', data)
    if (data?.status === 'preparing') prepareEagleImportNotification(data)
    if (data?.status === 'failed') failEagleImportNotification(data)
  })

  webSocketService.addEventListener('file::updated', (data) => {
    console.log('File updated:', data)
    handleFileEvent(data, 'updated')
  })

  webSocketService.addEventListener('file::deleted', (data) => {
    console.log('File deleted:', data)
    handleFileEvent(data, 'deleted')
  })

  webSocketService.addEventListener('file::recovered', (data) => {
    console.log('File recovered:', data)
    handleFileEvent(data, 'recovered')
  })

  // 监听回收站清空事件
  webSocketService.addEventListener('files::trash-emptied', (data) => {
    console.log('Trash emptied:', data)
    const { markTabsForEvent } = useTabs()
    const markedIds = markTabsForEvent(data, 'trash-emptied')
    for (const tabId of markedIds) {
      window.dispatchEvent(new CustomEvent('active-tab-refresh', {
        detail: { tabId, eventType: 'trash-emptied', data }
      }))
    }
  })

  // 监听缩略图生成事件
  webSocketService.addEventListener('thumbnail::generated', (data) => {
    console.log('Thumbnail generated:', data)
    const thumbUrl = appendThumbToken(toFileUrl(data.thumb))
    window.dispatchEvent(new CustomEvent('thumbnail-updated', {
      detail: { fileId: String(data.id), thumbPath: thumbUrl }
    }))
    // 缩略图就绪后补发到最近一次导入通知（file::created 时缩略图尚未生成）
    updateImportThumbIfPending(data.id, data.thumb)
    const eagleGroup = eagleImportGroupsByFileId.get(String(data.id))
    if (eagleGroup) {
      addEagleImportThumb(eagleGroup, data.thumb)
      showEagleImportGroup(eagleGroup)
    }
  })

  // 监听通知事件
  webSocketService.addEventListener('notification', (data) => {
    console.log('Notification received:', data)
    showDesktopNotification(data.title, data.body)
  })
}

/**
 * 处理文件事件，判断是否需要刷新当前tab
 * updated 事件按 tab 节流 300ms，避免批量更新时重复刷新
 */
const refreshTimers = new Map<string, ReturnType<typeof setTimeout>>()

function handleFileEvent(data: any, eventType: 'created' | 'updated' | 'deleted' | 'recovered'): void {
  const { markTabsForEvent, tabs } = useTabs()
  const markedIds = markTabsForEvent(data, eventType)
  if (markedIds.length === 0) return

  for (const tabId of markedIds) {
    const tab = tabs.value.find(t => t.id === tabId)
    if (!tab?.active) continue

    if (eventType === 'updated') {
      const existing = refreshTimers.get(tabId)
      if (existing) clearTimeout(existing)
      refreshTimers.set(tabId, setTimeout(() => {
        refreshTimers.delete(tabId)
        window.dispatchEvent(new CustomEvent('active-tab-refresh', {
          detail: { tabId, eventType, data }
        }))
      }, 300))
    } else {
      window.dispatchEvent(new CustomEvent('active-tab-refresh', {
        detail: { tabId, eventType, data }
      }))
    }
  }
}
