import { computed, watch } from 'vue'
import { throttle } from 'throttle-debounce'
import type { FileInfo } from '../../../../../shared/types'

interface UseSelectionProps {
  items: FileInfo[]
  selectedItems: string[]
}

interface UseSelectionEmits {
  (e: 'media-select', item: FileInfo, selected: boolean, event?: MouseEvent): void
  (e: 'media-click', item: FileInfo): void
}

export function useSelection(
  props: UseSelectionProps,
  emit: UseSelectionEmits
) {
  let lastSelectedItems: string[] = [...props.selectedItems]

  const throttledEmit = throttle(50, (eventName: 'media-select' | 'media-click', ...args: any[]) => {
    if (eventName === 'media-select') {
      const [item, selected, event] = args as [FileInfo, boolean, MouseEvent?]
      emit(eventName, item, selected, event)
    } else if (eventName === 'media-click') {
      const [item] = args as [FileInfo]
      emit(eventName, item)
    }
  })

  const batchEmitSelectionChanges = (added: string[], removed: string[], event?: MouseEvent) => {
    const allChanges: Array<{item: FileInfo, selected: boolean}> = []

    added.forEach(id => {
      const item = props.items.find(i => i.id === id)
      if (item) allChanges.push({item, selected: true})
    })

    removed.forEach(id => {
      const item = props.items.find(i => i.id === id)
      if (item) allChanges.push({item, selected: false})
    })

    allChanges.forEach(({item, selected}) => {
      emit('media-select', item, selected, event)
    })
  }

  watch(
    () => props.selectedItems,
    (newItems) => {
      const hasChanges =
        newItems.length !== lastSelectedItems.length ||
        !newItems.every(id => lastSelectedItems.includes(id))

      if (hasChanges) {
        lastSelectedItems = [...newItems]
      }
    },
    { deep: true }
  )

  const selectedIds = computed({
    get: () => props.selectedItems,
    set: (value: string[]) => {
      const newSelected = Array.from(value)
      const oldSelected = lastSelectedItems

      const added = newSelected.filter(id => !oldSelected.includes(id))
      const removed = oldSelected.filter(id => !newSelected.includes(id))

      if (added.length > 0 || removed.length > 0) {
        batchEmitSelectionChanges(added, removed)
        lastSelectedItems = [...newSelected]
      }
    }
  })

  const handleSelectionUpdate = (selectedIds: string[]) => {
    const newSelected = Array.from(selectedIds)
    const oldSelected = lastSelectedItems

    const added = newSelected.filter(id => !oldSelected.includes(id))
    const removed = oldSelected.filter(id => !newSelected.includes(id))

    if (added.length > 0 || removed.length > 0) {
      batchEmitSelectionChanges(added, removed)
      lastSelectedItems = [...newSelected]
    }
  }

  const handleItemClick = (itemId: string, event: MouseEvent) => {
    const item = props.items.find(i => i.id === itemId)
    if (item) {
      handleItemSelection(item, event)
    }
  }

  const handleClearSelection = () => {
    if (props.selectedItems.length > 0) {
      const itemsToClear = [...props.selectedItems]

      itemsToClear.forEach(id => {
        const item = props.items.find(i => i.id === id)
        if (item) {
          emit('media-select', item, false)
        }
      })

      lastSelectedItems = []
    }
  }

  const handleMediaItemClick = (item: FileInfo, event: MouseEvent) => {
    handleItemSelection(item, event)
    throttledEmit('media-click', item)
  }

  const handleItemSelection = (item: FileInfo, event: MouseEvent) => {
    const itemId = item.id
    const currentSelected = new Set(props.selectedItems)
    const wasSelected = currentSelected.has(itemId)

    let mode = 'normal'
    if (event.altKey) mode = 'deselect'
    else if (event.shiftKey && props.selectedItems.length > 0) mode = 'range'
    else if (event.ctrlKey || event.metaKey) mode = 'toggle'

    if (mode === 'deselect') {
      if (wasSelected) {
        throttledEmit('media-select', item, false, event)
      }
    } else if (mode === 'range') {
      const lastSelectedId = props.selectedItems[props.selectedItems.length - 1]
      const currentIndex = props.items.findIndex(i => i.id === itemId)
      const lastIndex = props.items.findIndex(i => i.id === lastSelectedId)

      if (currentIndex !== -1 && lastIndex !== -1) {
        const start = Math.min(currentIndex, lastIndex)
        const end = Math.max(currentIndex, lastIndex)

        const rangeSelectIds: string[] = []
        for (let i = start; i <= end; i++) {
          const rangeItem = props.items[i]
          if (rangeItem) {
            rangeSelectIds.push(rangeItem.id)
          }
        }

        const rangeSelectSet = new Set(rangeSelectIds)
        const rangeClearIds = props.selectedItems.filter(id => !rangeSelectSet.has(id))

        batchEmitSelectionChanges(rangeSelectIds, rangeClearIds, event)
      }
    } else if (mode === 'toggle') {
      if (wasSelected) {
        throttledEmit('media-select', item, false, event)
      } else {
        throttledEmit('media-select', item, true, event)
      }
    } else {
      if (wasSelected && currentSelected.size === 1) {
        return
      }

      const clearIds: string[] = []
      const selectIds: string[] = []

      props.selectedItems.forEach(id => {
        if (id !== itemId) {
          clearIds.push(id)
        }
      })

      if (!wasSelected) {
        selectIds.push(itemId)
      }

      if (clearIds.length > 0 || selectIds.length > 0) {
        batchEmitSelectionChanges(selectIds, clearIds, event)
      }
    }
  }

  return {
    selectedIds,
    handleSelectionUpdate,
    handleItemClick,
    handleClearSelection,
    handleMediaItemClick,
    handleItemSelection
  }
}
