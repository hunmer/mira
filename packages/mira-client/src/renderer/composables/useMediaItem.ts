/**
 * 媒体项逻辑处理 Composable
 * 提供媒体项的事件处理、状态计算等共享逻辑
 */
import { computed, type Ref } from 'vue'
import type { FileInfo } from '../../shared/types'
import { formatBytes, formatDate as formatDateUtil } from '../utils'
import { classifyMedia } from 'mira-app-core/shared/sdk'

export interface MediaItemEmits {
  (e: 'click', item: FileInfo, event: MouseEvent): void
  (e: 'double-click', item: FileInfo): void
  (e: 'context-menu', item: FileInfo, event: MouseEvent): void
  (e: 'mouse-enter', item: FileInfo, event: MouseEvent): void
  (e: 'mouse-leave', item: FileInfo, event: MouseEvent): void
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
    if (fileItem.localFile) return fileItem.localFile
    return !fileItem.path?.toLocaleLowerCase().startsWith('http') ? fileItem.path : undefined
  }

  // 文件扩展名
  const fileExtension = computed((): string => {
    // 仅当文件名含点分隔时才取最后一段作为扩展名，避免无扩展名文件把整个文件名当作扩展名
    const dotIdx = itemRef.value.name.lastIndexOf('.')
    const ext = itemRef.value.extension
      || (dotIdx > 0 ? itemRef.value.name.slice(dotIdx + 1).toUpperCase() : '')
    if (ext) return ext

    if (classifyMedia(itemRef.value.mimeType).isImage) {
      if (itemRef.value.mimeType.includes('png')) return 'PNG'
      if (itemRef.value.mimeType.includes('gif')) return 'GIF'
      if (itemRef.value.mimeType.includes('svg')) return 'SVG'
      return 'JPG'
    }
    if (classifyMedia(itemRef.value.mimeType).isVideo) return 'MP4'
    if (classifyMedia(itemRef.value.mimeType).isAudio) return 'MP3'
    return 'FILE'
  })

  // 是否为视频
  const isVideo = computed((): boolean => {
    return classifyMedia(itemRef.value.mimeType).isVideo
  })

  const isImage = computed((): boolean => {
    return classifyMedia(itemRef.value.mimeType).isImage
  })

  // 获取文件类型
  const getFileType = (fileItem: FileInfo): string => {
    const kind = classifyMedia(fileItem.mimeType).kind
    return kind === 'other' ? 'document' : kind
  }

  // 格式化（正源 renderer/utils formatBytes）
  const formatFileSize = formatBytes

  // 格式化（正源 renderer/utils/helpers formatDate）
  const formatDate = formatDateUtil

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

  const handleMouseEnter = (event: MouseEvent) => {
    emit('mouse-enter', itemRef.value, event)
  }

  const handleMouseLeave = (event: MouseEvent) => {
    emit('mouse-leave', itemRef.value, event)
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
    isImage,
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
