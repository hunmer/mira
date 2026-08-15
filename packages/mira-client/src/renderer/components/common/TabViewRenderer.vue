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
  <div ref="rootRef" class="w-full h-full relative overflow-hidden">
    <!-- 加载状态作为覆盖层，不能卸载已缓存的视图实例。 -->
    <div v-if="loading" class="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
      <i class="pi pi-spinner pi-spin text-2xl text-muted-foreground"></i>
      <span class="ml-2 text-muted-foreground">{{ $t('commonUi.tabViewRenderer.loading') }}</span>
    </div>

    <!-- 错误状态 -->
    <div v-if="error" class="absolute inset-0 z-10 flex flex-col items-center justify-center h-full text-center p-8 bg-background/80">
      <i class="pi pi-exclamation-triangle text-4xl text-destructive mb-4"></i>
      <h3 class="text-lg font-semibold text-foreground mb-2">{{ $t('commonUi.tabViewRenderer.loadFailedTitle') }}</h3>
      <p class="text-muted-foreground mb-4">{{ error }}</p>
      <Button @click="retry" severity="secondary" outlined>
        <i class="pi pi-refresh mr-2"></i>
        {{ $t('commonUi.tabViewRenderer.retry') }}
      </Button>
    </div>

    <!-- 视图组件渲染 -->
    <KeepAlive>
      <component
        v-if="viewConfig && componentInstance"
        :is="componentInstance"
        v-bind="viewConfig.props"
        :key="viewConfig.key || tabId"
        @error="handleComponentError"
        @item-select="handleItemSelect"
        @selection-change="handleSelectionChange"
        class="w-full h-full"
      />
    </KeepAlive>

    <!-- 空格预览：复用 hovercard 的预览内容，在当前 Tab 内全屏展示。 -->
    <div
      v-if="previewItem"
      class="absolute inset-0 z-50 bg-black"
      @click.stop
      @pointerdown.stop
    >
      <MediaPreviewContent
        :key="previewItem.id"
        :item="previewItem"
        class="!h-full !w-full !rounded-none"
      />
      <button
        type="button"
        class="absolute right-5 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
        :title="$t('common.close')"
        :aria-label="$t('common.close')"
        @click="closePreview"
      >
        <span class="material-icons">close</span>
      </button>
    </div>

    <!-- 空状态（没有配置视图） -->
    <div v-if="!loading && !error && (!viewConfig || !componentInstance)" class="flex flex-col items-center justify-center h-full text-center p-8">
      <i class="pi pi-inbox text-4xl text-muted-foreground mb-4"></i>
      <h3 class="text-lg font-semibold text-muted-foreground mb-2">{{ $t('commonUi.tabViewRenderer.emptyTitle') }}</h3>
      <p class="text-muted-foreground">{{ $t('commonUi.tabViewRenderer.emptyDesc') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, watch, onMounted, onUnmounted, nextTick, markRaw } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import type { TabViewConfig } from '@renderer/composables/TabRegistry'
import type { FileInfo } from '../../../shared/types'
import MediaPreviewContent from '@renderer/components/common/MediaPreviewContent.vue'

// Props 定义
interface Props {
  tabId: string
  viewConfig?: TabViewConfig | null
  cacheable?: boolean
}

const { t } = useI18n()

const props = withDefaults(defineProps<Props>(), {
  cacheable: true
})

// 响应式状态
const loading = ref(false)
const error = ref('')
const componentInstance = shallowRef<any>(null)
const rootRef = ref<HTMLElement | null>(null)
const previewItem = ref<FileInfo | null>(null)
const selectionHistory = ref<FileInfo[]>([])
const selectedIds = ref<Set<string>>(new Set())

const handleItemSelect = (item: FileInfo, selected: boolean) => {
    tabId: props.tabId,
    itemId: item.id,
    selected,
  })
  selectionHistory.value = selectionHistory.value.filter(entry => entry.id !== item.id)
  const nextIds = new Set(selectedIds.value)
  if (selected) {
    nextIds.add(item.id)
    selectionHistory.value.push(item)
  } else {
    nextIds.delete(item.id)
  }
  selectedIds.value = nextIds
  if (!selected && previewItem.value?.id === item.id) {
    previewItem.value = null
  }
}

const handleSelectionChange = (items: FileInfo[]) => {
    tabId: props.tabId,
    itemIds: items.map(item => item.id),
  })
  const nextIds = new Set(items.map(item => item.id))
  for (const item of items) {
    if (!selectedIds.value.has(item.id)) selectionHistory.value.push(item)
  }
  selectedIds.value = nextIds
  if (previewItem.value && !nextIds.has(previewItem.value.id)) previewItem.value = null
}

const getPreviewTarget = (): FileInfo | undefined => {
  return [...selectionHistory.value].reverse().find(item => selectedIds.value.has(item.id))
}

const closePreview = () => {
  previewItem.value = null
}

const isEditableTarget = (target: EventTarget | null) => {
  const element = target as HTMLElement | null
  return !!element && (element.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName))
}

const consumePreviewShortcut = (event: KeyboardEvent) => {
  event.preventDefault()
  event.stopPropagation()
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.code !== 'Space' && event.key !== ' ' && event.code !== 'Escape') return
  const visible = !!rootRef.value?.getClientRects().length
  const editable = isEditableTarget(event.target)
    tabId: props.tabId,
    code: event.code,
    key: event.key,
    visible,
    editable,
    selectedIds: [...selectedIds.value],
    historyIds: selectionHistory.value.map(item => item.id),
    previewItemId: previewItem.value?.id,
  })
  if (!visible || editable) return
  if (event.code === 'Escape' && previewItem.value) {
    consumePreviewShortcut(event)
    closePreview()
    return
  }
  if (event.code !== 'Space' && event.key !== ' ') return
  if (previewItem.value) {
    consumePreviewShortcut(event)
    closePreview()
    return
  }
  const target = getPreviewTarget()
    tabId: props.tabId,
    targetId: target?.id,
  })
  if (!target) return
  consumePreviewShortcut(event)
  previewItem.value = target
}

// 组件缓存
const componentCache = new Map<string, any>()

// 动态组件映射
const componentMap: Record<string, () => Promise<any>> = {
  'MediaTabListView': () => import('@renderer/components/tabs/MediaTabListView.vue'),
  'HomeTabView': () => import('@renderer/components/tabs/HomeTabView.vue'),
  'WebviewTabView': () => import('@renderer/components/tabs/WebviewTabView.vue'),
  'PluginCustomTabView': () => import('@renderer/components/tabs/PluginCustomTabView.vue'),
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
    tabId: props.tabId,
    cacheKey: cacheKey.value
  })

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
        throw new Error(t('commonUi.tabViewRenderer.unknownComponentType', { name: component }))
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
    error.value = err.message || t('commonUi.tabViewRenderer.unknownError')
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
  error.value = t('commonUi.tabViewRenderer.runtimeError', { message: err.message || t('commonUi.tabViewRenderer.unknownError') })
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
  window.addEventListener('keydown', handleKeydown, true)
    tabId: props.tabId,
    viewConfig: props.viewConfig
  })
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown, true)
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
