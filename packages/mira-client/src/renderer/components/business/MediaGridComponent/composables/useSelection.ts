import { computed, watch } from 'vue'
import { throttle } from 'throttle-debounce'
import type { FileInfo } from '../../../../../shared/types'

interface UseSelectionProps {
  items: FileInfo[]
  selectedItems: string[]
}

interface UseSelectionEmits {
  (e: 'media-select', item: FileInfo, selected: boolean): void
  (e: 'media-click', item: FileInfo): void
}

export function useSelection(
  props: UseSelectionProps,
  emit: UseSelectionEmits
) {
  console.log('🔧 useSelection initialized with:', {
    itemsCount: props.items.length,
    selectedItemsCount: props.selectedItems.length
  })

  // 存储上一次的选中状态，用于比较变化
  let lastSelectedItems: string[] = [...props.selectedItems]

  // 节流控制的 emit 函数，避免频繁触发
  const throttledEmit = throttle(50, (eventName: 'media-select' | 'media-click', ...args: any[]) => {
    if (eventName === 'media-select') {
      const [item, selected] = args as [FileInfo, boolean]
      console.log('🚀 Throttled emit:', eventName, item.name, selected)
      emit(eventName, item, selected)
    } else if (eventName === 'media-click') {
      const [item] = args as [FileInfo]
      emit(eventName, item)
    }
  })

  // 批量选中状态变更，减少单次emit调用
  // 注意：这里直接使用 emit 而不是 throttledEmit，因为 throttle 会覆盖参数导致只有最后一个事件被发送
  const batchEmitSelectionChanges = (added: string[], removed: string[]) => {
    const allChanges: Array<{item: FileInfo, selected: boolean}> = []

    // 收集所有变更
    added.forEach(id => {
      const item = props.items.find(i => i.id === id)
      if (item) allChanges.push({item, selected: true})
    })

    removed.forEach(id => {
      const item = props.items.find(i => i.id === id)
      if (item) allChanges.push({item, selected: false})
    })

    // 批量发送，直接使用 emit 避免节流导致参数覆盖
    allChanges.forEach(({item, selected}) => {
      console.log('🚀 Batch emit:', 'media-select', item.name, selected)
      emit('media-select', item, selected)
    })
  }

  // 监听 props.selectedItems 的外部变化，同步到缓存
  watch(
    () => props.selectedItems,
    (newItems) => {
      // 检查是否真的有变化（避免不必要的更新）
      const hasChanges =
        newItems.length !== lastSelectedItems.length ||
        !newItems.every(id => lastSelectedItems.includes(id))

      if (hasChanges) {
        console.log('🔄 External selection change detected, updating cache:', {
          oldCount: lastSelectedItems.length,
          newCount: newItems.length,
          newItems: newItems
        })
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

      // 只在实际有变化时输出
      const added = newSelected.filter(id => !oldSelected.includes(id))
      const removed = oldSelected.filter(id => !newSelected.includes(id))

      if (added.length > 0 || removed.length > 0) {
        console.log('🔄 Selection changed:', {
          added: added.length,
          removed: removed.length,
          total: newSelected.length
        })

        // 使用批量emit处理
        batchEmitSelectionChanges(added, removed)

        // 更新缓存的选中状态
        lastSelectedItems = [...newSelected]
      }
    }
  })

  const handleSelectionUpdate = (selectedIds: string[]) => {
    // 实时选择更新时的处理
    const newSelected = Array.from(selectedIds)
    const oldSelected = lastSelectedItems // 使用缓存的状态而不是props

    // 找出新增和移除的项目
    const added = newSelected.filter(id => !oldSelected.includes(id))
    const removed = oldSelected.filter(id => !newSelected.includes(id))

    // 只在有变化时输出
    if (added.length > 0 || removed.length > 0) {
      console.log('📋 Selection update:', {
        added: added.length,
        removed: removed.length,
        from: 'SelectionBox',
        oldState: oldSelected.length,
        newState: newSelected.length
      })

      // 使用批量emit处理
      batchEmitSelectionChanges(added, removed)

      // 更新缓存的选中状态
      lastSelectedItems = [...newSelected]
    }
  }

  const handleItemClick = (itemId: string, event: MouseEvent) => {
    // SelectionBox 内部的项目点击处理
    const item = props.items.find(i => i.id === itemId)
    if (item) {
      console.log('👆 Box item click:', item.name)
      handleItemSelection(item, event)
    } else {
      console.warn('⚠️ Item not found for id:', itemId)
    }
  }

  const handleClearSelection = () => {
    // 清空选择时的处理
    if (props.selectedItems.length > 0) {
      console.log('🧹 Clearing selection:', props.selectedItems.length, 'items')

      // 记录当前需要清空的项目
      const itemsToClear = [...props.selectedItems]

      console.log('🧹 Items to clear:', itemsToClear)

      // 直接发送清空事件，不使用节流（清空操作需要立即完成）
      itemsToClear.forEach(id => {
        const item = props.items.find(i => i.id === id)
        if (item) {
          console.log('❌ Immediately clearing:', item.name)
          emit('media-select', item, false)
        }
      })

      // 立即更新缓存为空状态
      lastSelectedItems = []

      console.log('✅ Selection cache cleared, remaining:', lastSelectedItems.length)
    }
  }

  const handleMediaItemClick = (item: FileInfo, event: MouseEvent) => {
    console.log('🖱️ Media click:', item.name)
    handleItemSelection(item, event)
    throttledEmit('media-click', item)
  }

  const handleItemSelection = (item: FileInfo, event: MouseEvent) => {
    const itemId = item.id
    const currentSelected = new Set(props.selectedItems)
    const wasSelected = currentSelected.has(itemId)

    // 根据按键修饰符确定选择模式
    let mode = 'normal'
    if (event.altKey) mode = 'deselect'
    else if (event.shiftKey && props.selectedItems.length > 0) mode = 'range'
    else if (event.ctrlKey || event.metaKey) mode = 'toggle'

    console.log('🎯 Selection mode:', mode, 'for:', item.name, 'currently selected:', wasSelected)

    if (mode === 'deselect') {
      if (wasSelected) {
        console.log('❌ Alt deselect:', item.name)
        throttledEmit('media-select', item, false)
      }
    } else if (mode === 'range') {
      const lastSelectedId = props.selectedItems[props.selectedItems.length - 1]
      const currentIndex = props.items.findIndex(i => i.id === itemId)
      const lastIndex = props.items.findIndex(i => i.id === lastSelectedId)

      if (currentIndex !== -1 && lastIndex !== -1) {
        const start = Math.min(currentIndex, lastIndex)
        const end = Math.max(currentIndex, lastIndex)
        const rangeSize = end - start + 1

        console.log('⇧ Range select:', rangeSize, 'items')

        // 收集范围选择的项目
        const rangeSelectIds: string[] = []
        for (let i = start; i <= end; i++) {
          const rangeItem = props.items[i]
          if (rangeItem) {
            rangeSelectIds.push(rangeItem.id)
          }
        }

        // 计算需要取消选中的项目（不在范围内的已选中项目）
        const rangeSelectSet = new Set(rangeSelectIds)
        const rangeClearIds = props.selectedItems.filter(id => !rangeSelectSet.has(id))

        // 批量处理范围选择
        batchEmitSelectionChanges(rangeSelectIds, rangeClearIds)
      }
    } else if (mode === 'toggle') {
      if (wasSelected) {
        console.log('❌ Ctrl deselect:', item.name)
        throttledEmit('media-select', item, false)
      } else {
        console.log('✅ Ctrl select:', item.name)
        throttledEmit('media-select', item, true)
      }
    } else {
      // 单选模式
      if (wasSelected && currentSelected.size === 1) {
        console.log('⏭️ Already single selected, skipping')
        return
      }

      // 收集单选模式的变更
      const clearIds: string[] = []
      const selectIds: string[] = []

      // 清空其他选择
      props.selectedItems.forEach(id => {
        if (id !== itemId) {
          clearIds.push(id)
        }
      })

      // 选择当前项目
      if (!wasSelected) {
        selectIds.push(itemId)
      }

      if (clearIds.length > 0) {
        console.log('❌ Cleared', clearIds.length, 'other selections')
      }
      if (selectIds.length > 0) {
        console.log('✅ Normal select:', item.name)
      }

      // 批量处理单选变更
      if (clearIds.length > 0 || selectIds.length > 0) {
        batchEmitSelectionChanges(selectIds, clearIds)
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