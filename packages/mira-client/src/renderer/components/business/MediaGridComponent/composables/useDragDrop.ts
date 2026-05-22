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
        cleanup()
        startNativeDrag(event, item)
      }
    }, 500)
  }

  const startNativeDrag = async (event: PointerEvent, item: FileInfo) => {
    isDragInitiated = true
    ;(window as any).__miraInternalDrag = true

    const selectedFileIds = props.selectedItems.includes(item.id) ? props.selectedItems : [item.id]

    const filePaths: string[] = []

    selectedFileIds.forEach(fileId => {
      const mediaItemElement = document.querySelector(`[data-selectable-id="${fileId}"]`) as HTMLElement
      if (mediaItemElement) {
        const dataFile = mediaItemElement.getAttribute('data-file')
        if (dataFile && dataFile.trim()) {
          filePaths.push(dataFile)
        } else {
          const file = props.items.find(f => f.id === fileId)
          if (file?.libraryId) {
            const localPath = mediaStore.getLocalFile(file.libraryId, fileId)
            if (localPath) {
              filePaths.push(localPath)
            }
          }
        }
      }
    })

    if (filePaths.length === 0) return

    try {
      if (window.electronAPI) {
        const iconInfo = extractDragIconFromEvent(event)

        let result
        if (filePaths.length === 1) {
          result = await window.electronAPI.invoke('drag-drop:start', filePaths[0], iconInfo)
        } else {
          result = await window.electronAPI.invoke('drag-drop:start-multiple', filePaths, iconInfo)
        }

        if (result.success) {
          const target = event.target as HTMLElement
          if (target) {
            target.style.opacity = '0.5'
            target.style.cursor = 'grabbing'

            setTimeout(() => {
              target.style.opacity = ''
              target.style.cursor = ''
            }, 200)
          }
        }
      }
    } catch {
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
            return {
              iconPath: match[1],
              iconType: 'background-image'
            }
          }
        }

        const imgElement = element.querySelector('img')
        if (imgElement && imgElement.src) {
          return {
            iconPath: imgElement.src,
            iconType: 'child-image'
          }
        }

        return {}
      }

      return findImageInElement(mediaItemElement)
    } catch {
      return {}
    }
  }

  return {
    handlePointerDown
  }
}