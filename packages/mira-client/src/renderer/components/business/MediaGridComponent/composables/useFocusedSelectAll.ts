import { onMounted, onUnmounted, type Ref } from 'vue'
import type { FileInfo } from '../../../../shared/types'

interface SelectAllProps {
  items: FileInfo[]
  selectedItems?: string[]
}

interface SelectionBoxComponent {
  $el?: unknown
}

type MediaSelectEmit = (event: 'media-select', item: FileInfo, selected: boolean) => void

export function useFocusedSelectAll<T extends SelectionBoxComponent>(
  selectionBoxRef: Ref<T | null>,
  props: SelectAllProps,
  emit: MediaSelectEmit
) {
  const getSelectionBoxElement = (): HTMLElement | null => {
    const el = selectionBoxRef.value?.$el
    return el instanceof HTMLElement ? el : null
  }

  const focusSelectionBox = () => {
    getSelectionBoxElement()?.focus({ preventScroll: true })
  }

  const isSelectionBoxFocused = (): boolean => {
    const el = getSelectionBoxElement()
    const activeElement = document.activeElement
    return !!el && activeElement instanceof Node && el.contains(activeElement)
  }

  const selectAll = () => {
    const currentSelected = new Set(props.selectedItems ?? [])
    props.items.forEach(item => {
      if (!currentSelected.has(item.id)) {
        emit('media-select', item, true)
      }
    })
  }

  const handleEditAction = (event: Event) => {
    const detail = (event as CustomEvent).detail
    if (detail?.action !== 'select-all') return

    const el = getSelectionBoxElement()
    if (!el) return
    if (!isSelectionBoxFocused()) return

    const rect = el.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return

    selectAll()
  }

  onMounted(() => {
    document.addEventListener('edit-action', handleEditAction)
  })

  onUnmounted(() => {
    document.removeEventListener('edit-action', handleEditAction)
  })

  return {
    focusSelectionBox,
    isSelectionBoxFocused
  }
}
