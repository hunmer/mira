<template>
  <div
    ref="containerRef"
    class="selection-container"
  >
    <!-- 选择框 -->
    <div
      v-if="selecting && isSelectionAreaValid"
      class="selection-box"
      :class="{ 'subtract-mode': altMode }"
      :style="selectionBoxStyle"
    />

    <!-- 插槽内容 -->
    <slot :selectedItems="selectedItems" :selecting="selecting" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'

interface SelectionBoxProps {
  modelValue?: string[]
  multiple?: boolean
  disabled?: boolean
  realtimeSelection?: boolean
  doubleClickToClear?: boolean
  longPressDelay?: number
  scrollAutoSpeed?: number
  scrollThreshold?: number
  minSelectionSize?: number
}

interface SelectionBoxEmits {
  (e: 'update:modelValue', value: string[]): void
  (e: 'selection-start', event: MouseEvent): void
  (e: 'selection-update', selectedIds: string[]): void
  (e: 'selection-end', selectedIds: string[]): void
  (e: 'item-click', itemId: string, event: MouseEvent): void
  (e: 'clear-selection'): void
}

interface SelectableRect {
  id: string
  left: number
  top: number
  right: number
  bottom: number
}

const props = withDefaults(defineProps<SelectionBoxProps>(), {
  modelValue: () => [],
  multiple: true,
  disabled: false,
  realtimeSelection: true,
  doubleClickToClear: true,
  longPressDelay: 150,
  scrollAutoSpeed: 10,
  scrollThreshold: 50,
  minSelectionSize: 5
})

const emit = defineEmits<SelectionBoxEmits>()

// 响应式数据
const containerRef = ref<HTMLElement | null>(null)
const selectedItems = ref(new Set<string>(props.modelValue))
const selecting = ref(false)
const startPos = ref({ x: 0, y: 0 })
const currentPos = ref({ x: 0, y: 0 })
const lastSelectedIndex = ref(-1)
const altMode = ref(false)
const itemsToRemove = ref(new Set<string>())
const initialSelectedItems = ref(new Set<string>())
const selectableRects = ref<SelectableRect[]>([])
let animationFrameId: number | null = null
let pendingMouseEvent: MouseEvent | null = null

// 监听 modelValue 变化
watch(() => props.modelValue, (newValue) => {
  selectedItems.value = new Set(newValue)
}, { deep: true })

// 监听 selectedItems 变化并同步到 modelValue
watch(selectedItems, (newSelected) => {
  const newValue = Array.from(newSelected)
  if (JSON.stringify(newValue.sort()) !== JSON.stringify(props.modelValue.sort())) {
    emit('update:modelValue', newValue)
  }
}, { deep: true })

// 计算选择框样式
const selectionBoxStyle = computed(() => {
  const left = Math.min(startPos.value.x, currentPos.value.x)
  const top = Math.min(startPos.value.y, currentPos.value.y)
  const width = Math.abs(currentPos.value.x - startPos.value.x)
  const height = Math.abs(currentPos.value.y - startPos.value.y)

  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`
  }
})

// 检查选择区域是否达到最小大小
const isSelectionAreaValid = computed(() => {
  const width = Math.abs(currentPos.value.x - startPos.value.x)
  const height = Math.abs(currentPos.value.y - startPos.value.y)
  return width >= props.minSelectionSize || height >= props.minSelectionSize
})

// 获取鼠标在容器中的相对位置
const getRelativePosition = (e: MouseEvent) => {
  if (!containerRef.value) return { x: 0, y: 0 }

  const rect = containerRef.value.getBoundingClientRect()
  const scrollLeft = containerRef.value.scrollLeft
  const scrollTop = containerRef.value.scrollTop

  return {
    x: e.clientX - rect.left + scrollLeft,
    y: e.clientY - rect.top + scrollTop
  }
}

// 开始选择
const startSelection = (e: MouseEvent) => {
  if (props.disabled) return

  // 检查是否点击在容器或允许选择的区域
  const target = e.target as HTMLElement
  if (!isSelectableArea(target)) return

  // 检查是否点击在可选择项目上
  const clickedItem = target.closest('[data-selectable-id]')
  if (clickedItem) {
    // 如果点击在项目上，不启动拖拽选择，让项目自己处理点击
    return
  }

  // 只有在空白区域才启动选择
  const pos = getRelativePosition(e)
  startPos.value = pos
  currentPos.value = pos
  altMode.value = e.altKey
  itemsToRemove.value.clear()
  initialSelectedItems.value = new Set(selectedItems.value)
  refreshSelectableRects()

  emit('selection-start', e)

  // 立即启动选择而不是延迟
  selecting.value = true

  // 移除单击清空逻辑，改为只有双击才清空

  // 阻止默认行为
  e.preventDefault()
  e.stopPropagation()
}

// 更新选择
const updateSelection = (e: MouseEvent) => {
  if (props.disabled || !selecting.value) return

  if (!containerRef.value) return

  // 限制选择框范围在容器内
  const containerRect = containerRef.value.getBoundingClientRect()
  const scrollLeft = containerRef.value.scrollLeft
  const scrollTop = containerRef.value.scrollTop
  const containerWidth = containerRef.value.clientWidth
  const containerHeight = containerRef.value.clientHeight

  let relativePos = getRelativePosition(e)

  // 限制坐标在容器范围内
  relativePos.x = Math.max(0, Math.min(relativePos.x, containerWidth + scrollLeft))
  relativePos.y = Math.max(0, Math.min(relativePos.y, containerHeight + scrollTop))

  currentPos.value = relativePos
  updateSelectedItems()
  handleAutoScroll(e)
}

const scheduleSelectionUpdate = (e: MouseEvent) => {
  if (!selecting.value) return

  pendingMouseEvent = e

  if (animationFrameId !== null) return

  animationFrameId = window.requestAnimationFrame(() => {
    animationFrameId = null

    if (pendingMouseEvent) {
      updateSelection(pendingMouseEvent)
      pendingMouseEvent = null
    }
  })
}

// 结束选择
const endSelection = (e: MouseEvent) => {
  if (selecting.value) {
    if (altMode.value) {
      itemsToRemove.value.forEach(itemId => {
        selectedItems.value.delete(itemId)
      })
      itemsToRemove.value.clear()
    }

    emit('selection-end', Array.from(selectedItems.value))
  }

  selecting.value = false
  altMode.value = false
  initialSelectedItems.value.clear()
  selectableRects.value = []
}

// 更新选中项目
const updateSelectedItems = () => {
  if (!containerRef.value) return

  // 只有当选择区域达到最小大小时才进行实际的选择操作
  if (!isSelectionAreaValid.value) {
    return
  }

  const selectionRect = {
    left: Math.min(startPos.value.x, currentPos.value.x),
    top: Math.min(startPos.value.y, currentPos.value.y),
    right: Math.max(startPos.value.x, currentPos.value.x),
    bottom: Math.max(startPos.value.y, currentPos.value.y)
  }

  if (altMode.value) {
    itemsToRemove.value.clear()

    selectableRects.value.forEach((itemRect) => {
      const isIntersecting = !(
        itemRect.right < selectionRect.left ||
        itemRect.left > selectionRect.right ||
        itemRect.bottom < selectionRect.top ||
        itemRect.top > selectionRect.bottom
      )

      if (isIntersecting && initialSelectedItems.value.has(itemRect.id)) {
        itemsToRemove.value.add(itemRect.id)
      }
    })
  } else {
    const currentSelection = new Set(initialSelectedItems.value)

    selectableRects.value.forEach((itemRect) => {
      const isIntersecting = !(
        itemRect.right < selectionRect.left ||
        itemRect.left > selectionRect.right ||
        itemRect.bottom < selectionRect.top ||
        itemRect.top > selectionRect.bottom
      )

      if (isIntersecting) {
        currentSelection.add(itemRect.id)
      }
    })

    if (props.realtimeSelection) {
      emitSelectionUpdate(currentSelection)
    }
  }
}

// 自动滚动功能
const handleAutoScroll = (e: MouseEvent) => {
  if (!containerRef.value) return

  const rect = containerRef.value.getBoundingClientRect()

  if (e.clientY < rect.top + props.scrollThreshold) {
    containerRef.value.scrollTop -= props.scrollAutoSpeed
  } else if (e.clientY > rect.bottom - props.scrollThreshold) {
    containerRef.value.scrollTop += props.scrollAutoSpeed
  }

  if (e.clientX < rect.left + props.scrollThreshold) {
    containerRef.value.scrollLeft -= props.scrollAutoSpeed
  } else if (e.clientX > rect.right - props.scrollThreshold) {
    containerRef.value.scrollLeft += props.scrollAutoSpeed
  }
}

// 清空选择 - 只有双击才清空
const clearSelection = (e?: MouseEvent) => {
  if (props.disabled || !props.doubleClickToClear) return

  if (e) {
    const target = e.target as HTMLElement
    if (!isSelectableArea(target)) return
  }

  console.log('🧹 Double click to clear all selections')
  selectedItems.value.clear()
  lastSelectedIndex.value = -1
  emit('clear-selection')
}

// 处理滚动事件
const handleScroll = () => {
  if (selecting.value) {
    refreshSelectableRects()
    updateSelectedItems()
  }
}

// 检查是否为可选择区域
const isSelectableArea = (target: HTMLElement): boolean => {
  // 检查是否点击在不允许选择的元素上
  const nonSelectableElements = ['button', 'input', 'select', 'textarea', 'a']
  const tagName = target.tagName.toLowerCase()

  // 如果点击的是不允许选择的元素，返回 false
  if (nonSelectableElements.includes(tagName)) {
    return false
  }

  // 检查是否有特定的非选择类
  if (target.classList.contains('no-select') || target.closest('.no-select')) {
    return false
  }

  // 检查是否在选择容器内
  return target === containerRef.value || target.closest('.selection-container') === containerRef.value
}

// 获取所有可选择的元素
const getSelectableElements = (): HTMLElement[] => {
  if (!containerRef.value) return []

  // 查找具有 data-selectable-id 属性的元素
  const elements = containerRef.value.querySelectorAll('[data-selectable-id]')
  return Array.from(elements) as HTMLElement[]
}

// 从元素获取项目ID
const getElementItemId = (element: HTMLElement): string | null => {
  return element.getAttribute('data-selectable-id')
}

// 处理点击事件
const refreshSelectableRects = () => {
  if (!containerRef.value) {
    selectableRects.value = []
    return
  }

  const containerRect = containerRef.value.getBoundingClientRect()
  const scrollLeft = containerRef.value.scrollLeft
  const scrollTop = containerRef.value.scrollTop

  selectableRects.value = getSelectableElements().reduce<SelectableRect[]>((rects, element) => {
    const id = getElementItemId(element)
    if (!id) return rects

    const rect = element.getBoundingClientRect()
    rects.push({
      id,
      left: rect.left - containerRect.left + scrollLeft,
      top: rect.top - containerRect.top + scrollTop,
      right: rect.right - containerRect.left + scrollLeft,
      bottom: rect.bottom - containerRect.top + scrollTop
    })

    return rects
  }, [])
}

const emitSelectionUpdate = (nextSelection: Set<string>) => {
  const currentSelection = selectedItems.value
  const hasChanges =
    nextSelection.size !== currentSelection.size ||
    Array.from(nextSelection).some(itemId => !currentSelection.has(itemId))

  if (!hasChanges) return

  selectedItems.value = nextSelection
  emit('selection-update', Array.from(nextSelection))
}

const handleItemClick = (itemId: string, event: MouseEvent) => {
  if (props.disabled) return
  console.log({event})
  event.stopPropagation()

  if (event.altKey) {
    if (selectedItems.value.has(itemId)) {
      selectedItems.value.delete(itemId)
    }
  } else if (event.shiftKey && lastSelectedIndex.value !== -1 && props.multiple) {
    // Shift范围选择逻辑需要根据具体使用场景实现
    // 这里提供基础框架
    const selectableElements = getSelectableElements()
    const currentIndex = selectableElements.findIndex(el => getElementItemId(el) === itemId)
    const start = Math.min(lastSelectedIndex.value, currentIndex)
    const end = Math.max(lastSelectedIndex.value, currentIndex)

    for (let i = start; i <= end; i++) {
      const elementId = getElementItemId(selectableElements[i])
      if (elementId) {
        selectedItems.value.add(elementId)
      }
    }
  } else if (event.ctrlKey && props.multiple) {
    if (selectedItems.value.has(itemId)) {
      selectedItems.value.delete(itemId)
    } else {
      selectedItems.value.add(itemId)
    }
  } else {
    if (!props.multiple) {
      selectedItems.value.clear()
    }
    selectedItems.value.add(itemId)
  }

  // 更新最后选择的索引
  const selectableElements = getSelectableElements()
  lastSelectedIndex.value = selectableElements.findIndex(el => getElementItemId(el) === itemId)

  emit('item-click', itemId, event)
}

// 全局鼠标事件监听
const handleGlobalMouseMove = (e: MouseEvent) => {
  if (selecting.value) {
    scheduleSelectionUpdate(e)
  }
}

const handleGlobalMouseUp = (e: MouseEvent) => {
  if (selecting.value && containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect()
    const isOutside = e.clientX < rect.left ||
                     e.clientX > rect.right ||
                     e.clientY < rect.top ||
                     e.clientY > rect.bottom

    if (isOutside) {
      // 移出容器范围时结束选择
      endSelection(e)
      return
    }
  }

  endSelection(e)
}

// 窗口失去焦点时取消选择
const handleWindowBlur = () => {
  if (selecting.value) {
    console.log('🔍 Window lost focus, canceling selection')
    // 重置选择状态，不触发选择事件
    selecting.value = false
    altMode.value = false
    initialSelectedItems.value.clear()
    itemsToRemove.value.clear()

    // 恢复到之前的选择状态
    selectedItems.value = new Set(initialSelectedItems.value)
  }
}

// 键盘快捷键
const handleKeyDown = (e: KeyboardEvent) => {
  if (props.disabled) return

  if (e.key === 'Escape') {
    clearSelection()
  }
}

// 暴露给父组件的方法
const selectItem = (itemId: string) => {
  selectedItems.value.add(itemId)
}

const deselectItem = (itemId: string) => {
  selectedItems.value.delete(itemId)
}

const toggleItem = (itemId: string) => {
  if (selectedItems.value.has(itemId)) {
    selectedItems.value.delete(itemId)
  } else {
    selectedItems.value.add(itemId)
  }
}

const selectAll = () => {
  if (!props.multiple) return

  const selectableElements = getSelectableElements()
  selectableElements.forEach(element => {
    const itemId = getElementItemId(element)
    if (itemId) {
      selectedItems.value.add(itemId)
    }
  })
}

const isSelected = (itemId: string): boolean => {
  return selectedItems.value.has(itemId)
}

const getSelectedCount = (): number => {
  return selectedItems.value.size
}

defineExpose({
  selectItem,
  deselectItem,
  toggleItem,
  selectAll,
  clearSelection,
  isSelected,
  getSelectedCount,
  handleItemClick
})

// 生命周期
onMounted(() => {
  document.addEventListener('mousemove', handleGlobalMouseMove)
  document.addEventListener('mouseup', handleGlobalMouseUp)
  document.addEventListener('keydown', handleKeyDown)
  window.addEventListener('blur', handleWindowBlur)

  if (containerRef.value) {
    containerRef.value.addEventListener('mousedown', startSelection)
    containerRef.value.addEventListener('dblclick', clearSelection)
    containerRef.value.addEventListener('scroll', handleScroll)
  }
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleGlobalMouseMove)
  document.removeEventListener('mouseup', handleGlobalMouseUp)
  document.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('blur', handleWindowBlur)

  if (animationFrameId !== null) {
    window.cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }

  // 清理容器事件监听
  if (containerRef.value) {
    containerRef.value.removeEventListener('mousedown', startSelection)
    containerRef.value.removeEventListener('dblclick', clearSelection)
    containerRef.value.removeEventListener('scroll', handleScroll)
  }
})
</script>

<style scoped>
.selection-container {
  position: relative;
  width: 100%;
  height: 100%;
  user-select: none;
  /* 允许点击事件穿透到子元素 */
  pointer-events: auto;
}

.selection-container > * {
  /* 恢复子元素的点击事件 */
  pointer-events: auto;
}

.selection-box {
  position: absolute;
  border: 2px dashed #3b82f6;
  background: rgba(59, 130, 246, 0.1);
  pointer-events: none;
  z-index: 1000;
  backdrop-filter: blur(2px);
  animation: pulse 2s infinite;
  border-radius: 4px;
}

.selection-box.subtract-mode {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.6;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.01);
  }
}

/* 选中状态样式 - 由具体组件自己处理样式 */
:deep([data-selectable-id].selected) {
  transition: all 0.2s ease;
}

:deep([data-selectable-id]) {
  transition: all 0.2s ease;
}
</style>
