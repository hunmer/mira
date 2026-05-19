import { ref } from 'vue'
import type { FileInfo } from '../../../../../shared/types'
import { useMediaStore } from '../../../../stores/media'

export function useDragDrop(props: { items: FileInfo[], selectedItems: string[] }) {
  const mediaStore = useMediaStore()

  let dragStartTimer: NodeJS.Timeout | null = null
  let isDragInitiated = false

  const handlePointerDown = (event: PointerEvent, item: FileInfo) => {
    if (dragStartTimer) {
      clearTimeout(dragStartTimer)
      dragStartTimer = null
    }

    isDragInitiated = false

    if (event.button !== 0) return

    console.log('🖱️ PointerDown detected on media item:', item.name)

    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()

    const startX = event.clientX
    const startY = event.clientY
    const startTime = Date.now()
    let dragDetected = false

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = Math.abs(moveEvent.clientX - startX)
      const deltaY = Math.abs(moveEvent.clientY - startY)

      if ((deltaX > 5 || deltaY > 5) && !dragDetected) {
        dragDetected = true
        console.log('🎯 检测到拖拽移动，启动原生拖拽')

        cleanup()

        if (!isDragInitiated) {
          startNativeDrag(moveEvent, item)
        }
      }
    }

    const handlePointerUp = (upEvent: PointerEvent) => {
      const deltaTime = Date.now() - startTime
      const deltaX = Math.abs(upEvent.clientX - startX)
      const deltaY = Math.abs(upEvent.clientY - startY)

      cleanup()

      if (!dragDetected && deltaTime < 200 && deltaX < 5 && deltaY < 5) {
        console.log('👆 检测到点击事件')
        return { isClick: true, event: upEvent }
      }
      return { isClick: false }
    }

    const cleanup = () => {
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', handlePointerUp)
      if (dragStartTimer) {
        clearTimeout(dragStartTimer)
        dragStartTimer = null
      }
    }

    document.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('pointerup', handlePointerUp)

    dragStartTimer = setTimeout(() => {
      if (!isDragInitiated && !dragDetected) {
        dragDetected = true
        console.log('🕒 长按检测，启动拖拽')

        cleanup()
        startNativeDrag(event, item)
      }
    }, 500)
  }

  const startNativeDrag = async (event: PointerEvent, item: FileInfo) => {
    isDragInitiated = true
    ;(window as any).__miraInternalDrag = true

    const selectedFileIds = props.selectedItems.includes(item.id) ? props.selectedItems : [item.id]

    console.log('🎯 启动原生拖拽:', selectedFileIds.length > 1 ? `${selectedFileIds.length} 个文件` : item.name)
    console.log('📁 选中的文件ID:', selectedFileIds)

    const filePaths: string[] = []

    selectedFileIds.forEach(fileId => {
      const mediaItemElement = document.querySelector(`[data-selectable-id="${fileId}"]`) as HTMLElement
      if (mediaItemElement) {
        const dataFile = mediaItemElement.getAttribute('data-file')
        if (dataFile && dataFile.trim()) {
          filePaths.push(dataFile)
          console.log(`✅ 从DOM获取到文件路径: ${fileId} -> ${dataFile}`)
        } else {
          console.warn(`⚠️ 文件 ${fileId} 没有 data-file 属性或为空，尝试从mediaStore获取`)
          const file = props.items.find(f => f.id === fileId)
          if (file?.libraryId) {
            const localPath = mediaStore.getLocalFile(file.libraryId, fileId)
            if (localPath) {
              filePaths.push(localPath)
              console.log(`✅ 从mediaStore获取到文件路径: ${fileId} -> ${localPath}`)
            } else {
              console.warn(`⚠️ 文件 ${fileId} 在mediaStore中也没有localFile记录`)
            }
          } else {
            console.warn(`⚠️ 文件 ${fileId} 没有libraryId，无法从mediaStore查找`)
          }
        }
      } else {
        console.warn(`⚠️ 找不到文件 ${fileId} 对应的DOM元素`)
      }
    })

    if (filePaths.length === 0) {
      console.warn('⚠️ 没有有效的文件路径，无法启动拖拽')
      return
    }

    console.log('📂 最终文件路径列表:', filePaths)

    try {
      if (window.electronAPI) {
        const iconInfo = extractDragIconFromEvent(event)

        let result
        if (filePaths.length === 1) {
          console.log('📋 调用单文件拖拽 IPC')
          result = await window.electronAPI.invoke('drag-drop:start', filePaths[0], iconInfo)
        } else {
          console.log('📋 调用多文件拖拽 IPC')
          result = await window.electronAPI.invoke('drag-drop:start-multiple', filePaths, iconInfo)
        }

        if (result.success) {
          console.log('✅ Electron 拖拽启动成功')

          const target = event.target as HTMLElement
          if (target) {
            target.style.opacity = '0.5'
            target.style.cursor = 'grabbing'

            setTimeout(() => {
              target.style.opacity = ''
              target.style.cursor = ''
            }, 200)
          }
        } else {
          console.error('❌ Electron 拖拽启动失败:', result.message)
        }
      } else {
        console.warn('⚠️ 非 Electron 环境，无法启动原生拖拽')
      }
    } catch (error) {
      console.error('❌ 调用拖拽 IPC 失败:', error)
    } finally {
      setTimeout(() => { (window as any).__miraInternalDrag = false }, 1000)
    }
  }

  const extractDragIconFromEvent = (event: PointerEvent): { iconPath?: string; iconType?: string } => {
    try {
      const target = event.target as HTMLElement

      let mediaItemElement: HTMLElement | null = target
      while (mediaItemElement &&
             !mediaItemElement.classList.contains('media-item') &&
             !mediaItemElement.classList.contains('media-list-item') &&
             !mediaItemElement.classList.contains('media-waterfall-item')) {
        mediaItemElement = mediaItemElement.parentElement as HTMLElement
      }

      if (!mediaItemElement) {
        return {}
      }

      const findImageInElement = (element: HTMLElement): { iconPath?: string; iconType?: string } => {
        if (element.tagName === 'IMG') {
          const img = element as HTMLImageElement
          if (img.src) {
            console.log('🖼️ 检测到图片元素, src:', img.src)
            return {
              iconPath: img.src,
              iconType: 'element-image'
            }
          }
        }

        const computedStyle = window.getComputedStyle(element)
        const backgroundImage = computedStyle.backgroundImage
        if (backgroundImage && backgroundImage !== 'none') {
          const match = backgroundImage.match(/url\(['"]?(.*?)['"]?\)/)
          if (match && match[1]) {
            console.log('🎨 检测到背景图片:', match[1])
            return {
              iconPath: match[1],
              iconType: 'background-image'
            }
          }
        }

        const imgElement = element.querySelector('img')
        if (imgElement && imgElement.src) {
          console.log('🔍 在子元素中找到图片:', imgElement.src)
          return {
            iconPath: imgElement.src,
            iconType: 'child-image'
          }
        }

        return {}
      }

      return findImageInElement(mediaItemElement)
    } catch (error) {
      console.error('提取图标信息失败:', error)
      return {}
    }
  }

  return {
    handlePointerDown
  }
}