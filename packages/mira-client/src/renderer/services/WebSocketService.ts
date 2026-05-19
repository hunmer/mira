import { ref, computed } from 'vue'
import { useLibraryStore } from '../stores/library'

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

  // 响应式状态
  public isConnected = ref(false)
  public isConnecting = ref(false)
  public lastError = ref<string | null>(null)

  /**
   * 连接到WebSocket服务器
   */
  async connect(config: WebSocketConfig): Promise<boolean> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected')
      return true
    }

    this.config = config
    this.isConnecting.value = true
    this.lastError.value = null

    try {
      const wsUrl = `${config.url}?clientId=${config.clientId}&libraryId=${config.libraryId}`
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
    if (this.ws) {
      this.ws.close()
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
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data)
      console.log('WebSocket message received:', data)

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

  private handleClose(event: CloseEvent): void {
    console.log('WebSocket connection closed:', event.code, event.reason)
    this.isConnected.value = false
    this.isConnecting.value = false

    // 如果不是主动关闭，尝试重连
    if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.attemptReconnect()
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
 * 设置WebSocket事件监听器
 */
function setupEventListeners(libraryStore: any): void {
  // 监听标签事件
  webSocketService.addEventListener('tag::created', (data) => {
    console.log('Tag created:', data)
    libraryStore.refreshTags?.(data.libraryId)
  })

  webSocketService.addEventListener('tag::update', (data) => {
    console.log('Tag updated:', data)
    libraryStore.refreshTags?.(data.libraryId)
  })

  webSocketService.addEventListener('tag::delete', (data) => {
    console.log('Tag deleted:', data)
    libraryStore.refreshTags?.(data.libraryId)
  })

  // 监听文件夹事件
  webSocketService.addEventListener('folder::created', (data) => {
    console.log('Folder created:', data)
    libraryStore.refreshFolders?.(data.libraryId)
  })

  webSocketService.addEventListener('folder::update', (data) => {
    console.log('Folder updated:', data)
    libraryStore.refreshFolders?.(data.libraryId)
  })

  webSocketService.addEventListener('folder::delete', (data) => {
    console.log('Folder deleted:', data)
    libraryStore.refreshFolders?.(data.libraryId)
  })

  // 监听文件事件
  webSocketService.addEventListener('file::created', (data) => {
    console.log('File created:', data)
    handleFileEvent(data, 'created')
  })

  webSocketService.addEventListener('file::update', (data) => {
    console.log('File updated:', data)
    handleFileEvent(data, 'updated')
  })

  webSocketService.addEventListener('file::delete', (data) => {
    console.log('File deleted:', data)
    handleFileEvent(data, 'deleted')
  })
}

/**
 * 处理文件事件，判断是否需要刷新当前tab
 */
function handleFileEvent(data: any, eventType: 'created' | 'updated' | 'deleted'): void {
  // 这里可以根据文件的tag和folders，判断当前是否有开启符合条件的tab
  // 如果有的话需要刷新这个tab
  
  // 获取当前路由信息
  const currentRoute = window.location.hash
  
  // 如果当前在文件列表页面，刷新列表
  if (currentRoute.includes('/home') || currentRoute.includes('/files')) {
    // 触发文件列表刷新事件
    window.dispatchEvent(new CustomEvent('refresh-file-list', { 
      detail: { eventType, data } 
    }))
  }
}
