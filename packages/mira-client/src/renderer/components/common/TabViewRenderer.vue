<!--
  Tab视图渲染器组件

  该组件负责动态渲染不同类型Tab的视图组件，是新视图架构的核心组件。
  支持：
  - 动态组件加载和渲染
  - 组件属性透传
  - 错误处理和占位显示
  - 缓存机制支持
-->

<template>
  <div class="w-full h-full relative overflow-hidden">
    <!-- 加载状态 -->
    <div v-if="loading" class="flex items-center justify-center h-full">
      <i class="pi pi-spinner pi-spin text-2xl text-muted-foreground"></i>
      <span class="ml-2 text-muted-foreground">加载中...</span>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="flex flex-col items-center justify-center h-full text-center p-8">
      <i class="pi pi-exclamation-triangle text-4xl text-destructive mb-4"></i>
      <h3 class="text-lg font-semibold text-foreground mb-2">视图加载失败</h3>
      <p class="text-muted-foreground mb-4">{{ error }}</p>
      <Button @click="retry" severity="secondary" outlined>
        <i class="pi pi-refresh mr-2"></i>
        重试
      </Button>
    </div>

    <!-- 视图组件渲染 -->
    <component
      v-else-if="viewConfig && componentInstance"
      :is="componentInstance"
      v-bind="viewConfig.props"
      :key="viewConfig.key || tabId"
      @error="handleComponentError"
      class="w-full h-full"
    />

    <!-- 空状态（没有配置视图） -->
    <div v-else class="flex flex-col items-center justify-center h-full text-center p-8">
      <i class="pi pi-inbox text-4xl text-muted-foreground mb-4"></i>
      <h3 class="text-lg font-semibold text-muted-foreground mb-2">暂无视图</h3>
      <p class="text-muted-foreground">该Tab类型尚未配置视图组件</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, watch, onMounted, onUnmounted, nextTick, markRaw } from 'vue'
import { Button } from '@/components/ui/button'
import type { TabViewConfig } from '@renderer/composables/TabRegistry'

// Props 定义
interface Props {
  tabId: string
  viewConfig?: TabViewConfig | null
  cacheable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  cacheable: true
})

// 响应式状态
const loading = ref(false)
const error = ref('')
const componentInstance = shallowRef<any>(null)

// 组件缓存
const componentCache = new Map<string, any>()

// 动态组件映射
const componentMap: Record<string, () => Promise<any>> = {
  'MediaTabListView': () => import('@renderer/components/tabs/MediaTabListView.vue'),
  'HomeTabView': () => import('@renderer/components/tabs/HomeTabView.vue'),
}

// 计算属性：缓存键
const cacheKey = computed(() => {
  if (!props.viewConfig) return ''
  return `${typeof props.viewConfig.component === 'string' ? props.viewConfig.component : 'dynamic'}-${props.viewConfig.key || props.tabId}`
})

// 加载组件
const loadComponent = async () => {
  if (!props.viewConfig) {
    componentInstance.value = null
    return
  }

  loading.value = true
  error.value = ''

  try {
    const { component } = props.viewConfig

    // 检查缓存
    if (props.cacheable && cacheKey.value && componentCache.has(cacheKey.value)) {
      componentInstance.value = componentCache.get(cacheKey.value)
      loading.value = false
      return
    }

    let resolvedComponent: any

    // 处理不同类型的组件
    if (typeof component === 'string') {
      // 字符串组件名，从映射中查找
      const componentLoader = componentMap[component]
      if (!componentLoader) {
        throw new Error(`未知的组件类型: ${component}`)
      }

      const module = await componentLoader()
      resolvedComponent = module.default || module
    } else {
      // 直接传入的组件对象
      resolvedComponent = component
    }

    componentInstance.value = markRaw(resolvedComponent)

    // 缓存组件
    if (props.cacheable && cacheKey.value) {
      componentCache.set(cacheKey.value, markRaw(resolvedComponent))
    }

    loading.value = false
  } catch (err: any) {
    console.error('🚨 TabViewRenderer: 组件加载失败', err)
    error.value = err.message || '未知错误'
    loading.value = false
  }
}

// 重试加载
const retry = () => {
  // 清理缓存
  if (cacheKey.value && componentCache.has(cacheKey.value)) {
    componentCache.delete(cacheKey.value)
  }
  loadComponent()
}

// 处理组件运行时错误
const handleComponentError = (err: any) => {
  console.error('🚨 TabViewRenderer: 组件运行时错误', err)
  error.value = '组件运行时错误: ' + (err.message || '未知错误')
}

// 监听视图配置变化
watch(
  () => props.viewConfig,
  () => {
    nextTick(() => {
      loadComponent()
    })
  },
  { deep: true, immediate: true }
)

// 组件生命周期
onMounted(() => {
  console.log('🔧 TabViewRenderer: 组件挂载', {
    tabId: props.tabId,
    viewConfig: props.viewConfig
  })
})

onUnmounted(() => {
  console.log('🔧 TabViewRenderer: 组件卸载', { tabId: props.tabId })

  // 清理缓存（如果不需要缓存）
  if (!props.cacheable && cacheKey.value && componentCache.has(cacheKey.value)) {
    componentCache.delete(cacheKey.value)
  }
})

// 暴露方法给父组件
defineExpose({
  retry,
  clearCache: () => {
    if (cacheKey.value && componentCache.has(cacheKey.value)) {
      componentCache.delete(cacheKey.value)
    }
  }
})
</script>

<style scoped>
.pi-spinner {
  animation: pi-spinner-rotate 2s linear infinite;
}

@keyframes pi-spinner-rotate {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>