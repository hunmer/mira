<template>
  <div 
    ref="containerRef"
    class="lazy-image-container block"
    :class="[
      'relative overflow-hidden bg-muted dark:bg-muted',
      roundedClass,
      aspectRatioClass
    ]"
  >
    <!-- 占位符/加载状态 -->
    <div 
      v-if="!loaded && !error"
      class="absolute inset-0 flex items-center justify-center"
      :class="placeholderClass"
    >
      <div v-if="showSkeleton" class="shimmer w-full h-full rounded"></div>
      <StatusImage
        v-else
        name="loading"
        size="2rem"
        :spin="true"
        :text="showPlaceholderText ? placeholderText : undefined"
        img-class="text-2xl"
      />
    </div>

    <!-- 错误状态 -->
    <div 
      v-if="error"
      class="absolute inset-0 flex items-center justify-center bg-muted dark:bg-muted"
      :class="errorClass"
    >
      <div class="flex flex-col items-center gap-2 text-muted-foreground">
        <StatusImage name="load_failed" size="2rem" img-class="text-2xl text-destructive" />
        <span class="text-xs">{{ errorText }}</span>
        <button
          v-if="allowRetry"
          @click="retry"
          class="text-xs text-primary-600 hover:text-primary-700 underline"
        >
          重试
        </button>
      </div>
    </div>

    <!-- 实际图片 -->
    <img
      v-if="shouldLoad"
      ref="imageRef"
      :src="src"
      :alt="alt"
      :class="[
        'transition-opacity duration-300',
        loaded ? 'opacity-100' : 'opacity-0',
        imageClass,
        objectFitClass
      ]"
      @load="handleLoad"
      @error="handleError"
      @click="handleClick"
    />

    <!-- 加载进度指示器 -->
    <div 
      v-if="showProgress && !loaded && !error && shouldLoad"
      class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30"
    >
      <Progress class="h-1 w-15" />
    </div>

    <!-- 覆盖层内容 -->
    <div 
      v-if="$slots.overlay && loaded"
      class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 opacity-0 hover:opacity-100 transition-opacity duration-200"
    >
      <slot name="overlay" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { Progress } from '@/components/ui/progress'
import StatusImage from './StatusImage.vue'

// Props
interface Props {
  src: string
  alt?: string
  placeholderText?: string
  errorText?: string
  lazy?: boolean
  showSkeleton?: boolean
  showPlaceholderText?: boolean
  showProgress?: boolean
  allowRetry?: boolean
  aspectRatio?: 'square' | '16-9' | '4-3' | '3-2' | 'auto'
  objectFit?: 'cover' | 'contain' | 'fill' | 'scale-down' | 'none'
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
  threshold?: number
  rootMargin?: string
  fadeInDuration?: number
}

const props = withDefaults(defineProps<Props>(), {
  alt: '',
  placeholderText: '加载中...',
  errorText: '加载失败',
  lazy: true,
  showSkeleton: true,
  showPlaceholderText: false,
  showProgress: false,
  allowRetry: true,
  aspectRatio: 'auto',
  objectFit: 'cover',
  rounded: 'md',
  threshold: 0.1,
  rootMargin: '50px',
  fadeInDuration: 300
})

// Emits
const emit = defineEmits<{
  load: [event: Event]
  error: [event: Event]
  click: [event: MouseEvent]
  visible: []
}>()

// 响应式引用
const containerRef = ref<HTMLElement>()
const imageRef = ref<HTMLImageElement>()
const loaded = ref(false)
const error = ref(false)
const inView = ref(false)
const retryCount = ref(0)

// 计算属性
const shouldLoad = computed(() => {
  return !props.lazy || inView.value
})

const aspectRatioClass = computed(() => {
  const ratios = {
    'square': 'aspect-square',
    '16-9': 'aspect-video',
    '4-3': 'aspect-[4/3]',
    '3-2': 'aspect-[3/2]',
    'auto': ''
  }
  return ratios[props.aspectRatio]
})

const objectFitClass = computed(() => {
  const fits = {
    'cover': 'object-cover',
    'contain': 'object-contain',
    'fill': 'object-fill',
    'scale-down': 'object-scale-down',
    'none': 'object-none'
  }
  return fits[props.objectFit]
})

const roundedClass = computed(() => {
  const rounds = {
    'none': '',
    'sm': 'rounded-sm',
    'md': 'rounded-md',
    'lg': 'rounded-lg',
    'xl': 'rounded-xl',
    'full': 'rounded-full'
  }
  return rounds[props.rounded]
})

const imageClass = computed(() => {
  return [
    'w-full h-full',
    objectFitClass.value,
    loaded.value ? '' : 'absolute inset-0'
  ]
})

const placeholderClass = computed(() => {
  return props.showSkeleton ? '' : 'bg-muted dark:bg-muted'
})

const errorClass = computed(() => {
  return roundedClass.value
})

// Intersection Observer
let observer: IntersectionObserver | null = null

const setupIntersectionObserver = () => {
  if (!props.lazy || !containerRef.value) return

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          inView.value = true
          emit('visible')
          if (observer) {
            observer.disconnect()
          }
        }
      })
    },
    {
      threshold: props.threshold,
      rootMargin: props.rootMargin
    }
  )

  observer.observe(containerRef.value)
}

// 事件处理
const handleLoad = (event: Event) => {
  loaded.value = true
  error.value = false
  emit('load', event)
}

const handleError = (event: Event) => {
  error.value = true
  loaded.value = false
  emit('error', event)
}

const handleClick = (event: MouseEvent) => {
  emit('click', event)
}

const retry = () => {
  if (retryCount.value >= 3) return // 最多重试3次
  
  error.value = false
  loaded.value = false
  retryCount.value++
  
  // 强制重新加载图片
  if (imageRef.value) {
    const timestamp = Date.now()
    const separator = props.src.includes('?') ? '&' : '?'
    imageRef.value.src = `${props.src}${separator}_t=${timestamp}`
  }
}

// 预加载方法
const preload = () => {
  if (!props.lazy) return
  
  const img = new Image()
  img.onload = (event) => handleLoad(event)
  img.onerror = (event) => {
    if (event instanceof Event) {
      handleError(event)
    }
  }
  img.src = props.src
}

// 生命周期
onMounted(() => {
  if (props.lazy) {
    setupIntersectionObserver()
  } else {
    inView.value = true
  }
})

onUnmounted(() => {
  if (observer) {
    observer.disconnect()
  }
})

// 监听src变化，重置状态
watch(() => props.src, () => {
  loaded.value = false
  error.value = false
  retryCount.value = 0
})

// 暴露方法
defineExpose({
  preload,
  retry,
  reload: retry,
  isLoaded: () => loaded.value,
  hasError: () => error.value,
  isInView: () => inView.value
})
</script>

<style scoped>
/* 骨架屏动画 */
.shimmer {
  background: linear-gradient(90deg,
    var(--muted) 25%,
    var(--background) 50%,
    var(--muted) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.dark .shimmer {
  background: linear-gradient(90deg,
    var(--muted) 25%,
    var(--background) 50%,
    var(--muted) 75%);
  background-size: 200% 100%;
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

/* 悬停效果 */
.lazy-image-container:hover img {
  transform: scale(1.02);
  transition: transform 0.3s ease, opacity 0.3s ease-in-out;
}

/* 无障碍访问 */
@media (prefers-reduced-motion: reduce) {
  img,
  .shimmer,
  .lazy-image-container:hover img {
    animation: none !important;
    transition: none !important;
    transform: none !important;
  }
}
</style>
