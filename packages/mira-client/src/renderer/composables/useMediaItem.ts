/**
 * 媒体项逻辑处理 Composable
 * 提供媒体项的事件处理、状态计算等共享逻辑
 */
import { computed, type Ref } from 'vue'
import type { FileInfo } from '../../../shared/types'

export interface MediaItemEmits {
  (e: 'click', item: FileInfo, event: MouseEvent): void
  (e: 'double-click', item: FileInfo): void
  (e: 'context-menu', item: FileInfo, event: MouseEvent): void
  (e: 'mouse-enter', item: FileInfo): void
  (e: 'mouse-leave', item: FileInfo): void
  (e: 'mouse-move', item: FileInfo, event: MouseEvent): void
  (e: 'pointer-down', event: PointerEvent, item: FileInfo): void
}

export interface UseMediaItemOptions {
  item: Ref<FileInfo> | FileInfo
  emit: (event: any, ...args: any[]) => void
}

/**
 * 使用媒体项逻辑
 */
export function useMediaItem(options: UseMediaItemOptions) {
  const { item, emit } = options

  // 确保 item 是 reactive reference
  const itemRef = computed(() => {
    return 'value' in item ? item.value : item
  })

  // 图片源
  const imageSrc = computed(() => {
    return itemRef.value.thumbnailPath || itemRef.value.url
  })

  // 获取本地文件路径
  const getLocalFile = (fileItem: FileInfo): string | undefined => {
    return fileItem.localFile || !fileItem.path?.toLocaleLowerCase().startsWith('http')
      ? fileItem.path
      : undefined
  }

  // 文件扩展名
  const fileExtension = computed((): string => {
    const ext = itemRef.value.extension || itemRef.value.name.split('.').pop()?.toUpperCase()
    if (ext) return ext

    if (itemRef.value.mimeType.startsWith('image/')) {
      if (itemRef.value.mimeType.includes('png')) return 'PNG'
      if (itemRef.value.mimeType.includes('gif')) return 'GIF'
      if (itemRef.value.mimeType.includes('svg')) return 'SVG'
      return 'JPG'
    }
    if (itemRef.value.mimeType.startsWith('video/')) return 'MP4'
    if (itemRef.value.mimeType.startsWith('audio/')) return 'MP3'
    return 'FILE'
  })

  // 是否为视频
  const isVideo = computed((): boolean => {
    return itemRef.value.mimeType.startsWith('video/')
  })

  // 获取文件类型
  const getFileType = (fileItem: FileInfo): string => {
    if (!fileItem.mimeType) return 'document'

    if (fileItem.mimeType.startsWith('image/')) return 'image'
    if (fileItem.mimeType.startsWith('video/')) return 'video'
    if (fileItem.mimeType.startsWith('audio/')) return 'audio'
    return 'document'
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'

    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 格式化日期
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      })
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString('zh-CN', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      })
    } else {
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }
  }

  // 事件处理器
  const handleClick = (event: MouseEvent) => {
    emit('click', itemRef.value, event)
  }

  const handleDoubleClick = () => {
    emit('double-click', itemRef.value)
  }

  const handleContextMenu = (event: MouseEvent) => {
    emit('context-menu', itemRef.value, event)
  }

  const handleMouseEnter = () => {
    emit('mouse-enter', itemRef.value)
  }

  const handleMouseLeave = () => {
    emit('mouse-leave', itemRef.value)
  }

  const handleMouseMove = (event: MouseEvent) => {
    emit('mouse-move', itemRef.value, event)
  }

  const handlePointerDown = (event: PointerEvent) => {
    emit('pointer-down', event, itemRef.value)
  }

  return {
    // 计算属性
    imageSrc,
    fileExtension,
    isVideo,

    // 工具函数
    getLocalFile,
    getFileType,
    formatFileSize,
    formatDate,

    // 事件处理器
    handleClick,
    handleDoubleClick,
    handleContextMenu,
    handleMouseEnter,
    handleMouseLeave,
    handleMouseMove,
    handlePointerDown
  }
}