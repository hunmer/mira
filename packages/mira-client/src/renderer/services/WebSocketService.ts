import { ref } from 'vue'
import { useLibraryStore } from '../stores/library'
import { useAuthStore } from '../stores/auth'
import { useSettingsStore } from '../stores/settings'
import { useTabs } from '../composables/useTabs'
import ConfigStorage from '../utils/ConfigStorage'

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
  })

  webSocketService.addEventListener('file::updated', (data) => {
    console.log('File updated:', data)
    handleFileEvent(data, 'updated')
  })

  webSocketService.addEventListener('file::deleted', (data) => {
    console.log('File deleted:', data)
    handleFileEvent(data, 'deleted')
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
    window.dispatchEvent(new CustomEvent('thumbnail-updated', {
      detail: { fileId: String(data.id), thumbPath: data.thumb }
    }))
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

function handleFileEvent(data: any, eventType: 'created' | 'updated' | 'deleted'): void {
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
