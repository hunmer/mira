<template>
  <div class="relative" ref="dropdownRef">
    <!-- 触发器 -->
    <div @click="toggle" ref="triggerRef">
      <slot name="trigger" :isOpen="isOpen" />
    </div>
    
    <!-- 下拉内容 -->
    <Teleport to="body">
      <Transition
        name="dropdown"
        @enter="onEnter"
        @leave="onLeave"
      >
        <div
          v-if="isOpen"
          ref="contentRef"
          class="fixed z-50 min-w-max"
          :style="contentStyle"
          @click="handleContentClick"
        >
          <div 
            class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg dark:shadow-black/30 overflow-hidden"
            :style="{ minWidth: minWidth }"
          >
            <slot name="content" :close="close" />
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

interface Props {
  offset?: { x: number; y: number }
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end' | 'bottom' | 'top'
  minWidth?: string
  closeOnContentClick?: boolean
  disabled?: boolean
}

interface Emits {
  (e: 'open'): void
  (e: 'close'): void
  (e: 'toggle', isOpen: boolean): void
}

const props = withDefaults(defineProps<Props>(), {
  offset: () => ({ x: 0, y: 8 }),
  placement: 'bottom-start',
  minWidth: '200px',
  closeOnContentClick: false,
  disabled: false
})

const emit = defineEmits<Emits>()

// 响应式状态
const isOpen = ref(false)
const dropdownRef = ref<HTMLElement>()
const triggerRef = ref<HTMLElement>()
const contentRef = ref<HTMLElement>()

// 计算下拉内容位置
const contentStyle = computed(() => {
  if (!triggerRef.value) return {}
  
  const triggerRect = triggerRef.value.getBoundingClientRect()
  const { x: offsetX, y: offsetY } = props.offset
  
  let left = triggerRect.left
  let top = triggerRect.bottom
  
  switch (props.placement) {
    case 'bottom-start':
      left = triggerRect.left + offsetX
      top = triggerRect.bottom + offsetY
      break
    case 'bottom-end':
      left = triggerRect.right + offsetX
      top = triggerRect.bottom + offsetY
      break
    case 'bottom':
      left = triggerRect.left + triggerRect.width / 2 + offsetX
      top = triggerRect.bottom + offsetY
      break
    case 'top-start':
      left = triggerRect.left + offsetX
      top = triggerRect.top - offsetY
      break
    case 'top-end':
      left = triggerRect.right + offsetX
      top = triggerRect.top - offsetY
      break
    case 'top':
      left = triggerRect.left + triggerRect.width / 2 + offsetX
      top = triggerRect.top - offsetY
      break
  }
  
  return {
    left: `${left}px`,
    top: `${top}px`,
    transformOrigin: props.placement.includes('top') ? 'bottom' : 'top'
  }
})

// 方法
const open = async () => {
  if (props.disabled || isOpen.value) return
  
  isOpen.value = true
  emit('open')
  emit('toggle', true)
  
  await nextTick()
  adjustPosition()
}

const close = () => {
  if (!isOpen.value) return
  
  isOpen.value = false
  emit('close')
  emit('toggle', false)
}

const toggle = async () => {
  if (props.disabled) return
  
  if (isOpen.value) {
    close()
  } else {
    await open()
  }
}

// 调整位置，防止超出视窗
const adjustPosition = () => {
  if (!contentRef.value) return
  
  const contentRect = contentRef.value.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  
  let leftNum = parseFloat(contentRef.value.style.left)
  let topNum = parseFloat(contentRef.value.style.top)
  
  // 水平调整
  if (leftNum + contentRect.width > viewportWidth) {
    leftNum = viewportWidth - contentRect.width - 16
  }
  if (leftNum < 16) {
    leftNum = 16
  }
  
  // 垂直调整
  if (topNum + contentRect.height > viewportHeight) {
    if (props.placement.includes('bottom')) {
      // 如果是向下展开但空间不够，改为向上
      const triggerRect = triggerRef.value?.getBoundingClientRect()
      if (triggerRect) {
        topNum = triggerRect.top - contentRect.height - props.offset.y
      }
    } else {
      topNum = viewportHeight - contentRect.height - 16
    }
  }
  if (topNum < 16) {
    topNum = 16
  }
  
  contentRef.value.style.left = `${leftNum}px`
  contentRef.value.style.top = `${topNum}px`
}

// 处理内容点击
const handleContentClick = (event: Event) => {
  if (props.closeOnContentClick) {
    close()
  }
  // 阻止事件冒泡到 document
  event.stopPropagation()
}

// 点击外部关闭
const handleClickOutside = (event: Event) => {
  if (!isOpen.value) return
  
  const target = event.target as Element
  if (
    dropdownRef.value?.contains(target) ||
    contentRef.value?.contains(target)
  ) {
    return
  }
  
  close()
}

// 动画钩子
const onEnter = (el: Element) => {
  const element = el as HTMLElement
  element.style.opacity = '0'
  element.style.transform = 'scale(0.95) translateY(-8px)'
  
  requestAnimationFrame(() => {
    element.style.transition = 'all 0.15s ease-out'
    element.style.opacity = '1'
    element.style.transform = 'scale(1) translateY(0)'
  })
}

const onLeave = (el: Element) => {
  const element = el as HTMLElement
  element.style.transition = 'all 0.1s ease-in'
  element.style.opacity = '0'
  element.style.transform = 'scale(0.95) translateY(-4px)'
}

// 处理滚动事件
const handleScroll = (event: Event) => {
  if (!isOpen.value) return

  const target = event.target as Element
  // 如果滚动发生在dropdown内容区域内，不关闭dropdown
  if (contentRef.value?.contains(target)) {
    return
  }

  close()
}

// 生命周期
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('resize', close)
  window.addEventListener('scroll', handleScroll, true)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('resize', close)
  window.removeEventListener('scroll', handleScroll, true)
})

// 暴露方法
defineExpose({
  open,
  close,
  toggle,
  isOpen: () => isOpen.value
})
</script>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.15s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-8px);
}
</style>
