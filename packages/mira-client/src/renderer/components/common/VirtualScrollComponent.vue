<template>
  <div 
    ref="containerRef"
    class="virtual-scroll-container relative overflow-y-auto overflow-x-hidden"
    :style="{ height: containerHeight }"
    @scroll="handleScroll"
  >
    <!-- 滚动区域占位 -->
    <div 
      class="virtual-scroll-spacer pointer-events-none"
      :style="{ height: totalHeight + 'px' }"
    ></div>
    
    <!-- 可见项容器 -->
    <div 
      class="virtual-scroll-content will-change-transform"
      :style="{ 
        transform: `translateY(${offsetY}px)`,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0
      }"
    >
      <div
        v-for="(item, index) in visibleItems"
        :key="getItemKey(item, startIndex + index)"
        class="virtual-scroll-item box-border"
        :style="{ height: itemHeight + 'px' }"
      >
        <slot :item="item" :index="startIndex + index">
          <!-- 默认渲染 -->
          <div class="p-4 border-b border-border">
            {{ item }}
          </div>
        </slot>
      </div>
    </div>
    
    <!-- 加载状态 -->
    <div 
      v-if="loading" 
      class="virtual-scroll-loading flex items-center justify-center p-4 bg-white/90 dark:bg-muted/90 backdrop-blur-[4px]"
      :style="{ 
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0
      }"
    >
      <Progress class="h-1 w-24" />
      <span class="ml-2 text-sm text-muted-foreground">加载中...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { Progress } from '@/components/ui/progress'

// Props
interface Props {
  items: any[]
  itemHeight: number
  containerHeight?: string
  overscan?: number
  keyField?: string
  loading?: boolean
  loadMore?: () => void
  threshold?: number
}

const props = withDefaults(defineProps<Props>(), {
  containerHeight: '400px',
  overscan: 5,
  keyField: 'id',
  loading: false,
  threshold: 100
})

// Emits
const emit = defineEmits<{
  scroll: [event: Event]
  loadMore: []
}>()

// 响应式引用
const containerRef = ref<HTMLElement>()
const scrollTop = ref(0)
const containerHeightPx = ref(400)

// 计算属性
const totalHeight = computed(() => props.items.length * props.itemHeight)

const visibleRange = computed(() => {
  const containerHeight = containerHeightPx.value
  const start = Math.floor(scrollTop.value / props.itemHeight)
  const visibleCount = Math.ceil(containerHeight / props.itemHeight)
  
  // 添加 overscan 缓冲区
  const startIndex = Math.max(0, start - props.overscan)
  const endIndex = Math.min(
    props.items.length - 1,
    start + visibleCount + props.overscan
  )
  
  return { startIndex, endIndex }
})

const startIndex = computed(() => visibleRange.value.startIndex)
const endIndex = computed(() => visibleRange.value.endIndex)

const visibleItems = computed(() => {
  return props.items.slice(startIndex.value, endIndex.value + 1)
})

const offsetY = computed(() => startIndex.value * props.itemHeight)

// 方法
const getItemKey = (item: any, index: number): string | number => {
  if (props.keyField && typeof item === 'object' && item[props.keyField] !== undefined) {
    return item[props.keyField]
  }
  return index
}

const handleScroll = (event: Event) => {
  const target = event.target as HTMLElement
  scrollTop.value = target.scrollTop
  
  emit('scroll', event)
  
  // 检查是否需要加载更多
  if (props.loadMore && !props.loading) {
    const scrollBottom = target.scrollTop + target.clientHeight
    const isNearBottom = totalHeight.value - scrollBottom <= props.threshold
    
    if (isNearBottom) {
      emit('loadMore')
    }
  }
}

const updateContainerHeight = () => {
  if (containerRef.value) {
    containerHeightPx.value = containerRef.value.clientHeight
  }
}

const scrollToIndex = (index: number, behavior: ScrollBehavior = 'smooth') => {
  if (containerRef.value) {
    const targetScrollTop = index * props.itemHeight
    containerRef.value.scrollTo({
      top: targetScrollTop,
      behavior
    })
  }
}

const scrollToTop = (behavior: ScrollBehavior = 'smooth') => {
  scrollToIndex(0, behavior)
}

const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
  scrollToIndex(props.items.length - 1, behavior)
}

// 生命周期
onMounted(() => {
  updateContainerHeight()
  window.addEventListener('resize', updateContainerHeight)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateContainerHeight)
})

// 监听容器高度变化
watch(() => props.containerHeight, () => {
  nextTick(() => {
    updateContainerHeight()
  })
})

// 暴露方法
defineExpose({
  scrollToIndex,
  scrollToTop,
  scrollToBottom,
  getVisibleRange: () => visibleRange.value
})
</script>

<style scoped>
/* 滚动条样式 */
.virtual-scroll-container::-webkit-scrollbar {
  width: 8px;
}

.virtual-scroll-container::-webkit-scrollbar-track {
  background: var(--muted);
  border-radius: 4px;
}

.virtual-scroll-container::-webkit-scrollbar-thumb {
  background: var(--muted-foreground);
  border-radius: 4px;
}

.virtual-scroll-container::-webkit-scrollbar-thumb:hover {
  background: var(--muted-foreground);
}

.dark .virtual-scroll-container::-webkit-scrollbar-track {
  background: var(--card);
}

.dark .virtual-scroll-container::-webkit-scrollbar-thumb {
  background: var(--muted-foreground);
}

.dark .virtual-scroll-container::-webkit-scrollbar-thumb:hover {
  background: var(--muted-foreground);
}
</style>
