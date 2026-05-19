<template>
  <div 
    ref="containerRef"
     <!-- 底部栏 -->
    <footer 
      v-if="$slots.footer"
      class="mira-footer mira-footer-sticky"
    >
      <slot name="footer" />
    </footer>"[
      'mira-responsive-layout',
      layoutClass,
      spacingClass,
      alignmentClass,
      breakpointClass
    ]"
    :style="containerStyle"
  >
    <!-- 主要内容区域 -->
    <main 
      v-if="$slots.default"
      :class="[
        'mira-main-content',
        mainContentClass
      ]"
    >
      <slot />
    </main>

    <!-- 侧边栏 -->
    <aside 
      v-if="$slots.sidebar"
      :class="[
        'mira-sidebar',
        sidebarClass,
        { 'mira-sidebar-collapsed': sidebarCollapsed }
      ]"
    >
      <slot name="sidebar" />
    </aside>

    <!-- 顶部栏 -->
    <header 
      v-if="$slots.header"
      :class="[
        'mira-header',
        headerClass
      ]"
    >
      <slot name="header" />
    </header>

    <!-- 底部栏  -->
    <footer 
      v-if="$slots.footer"
      class="mira-footer mira-footer-sticky"
    >
      <slot name="footer" />
    </footer>

    <!-- 移动端侧边栏覆盖层 -->
    <div 
      v-if="showMobileOverlay"
      class="mira-mobile-overlay"
      @click="closeMobileSidebar"
    ></div>

    <!-- 断点调试信息 -->
    <div 
      v-if="showBreakpointInfo && isDevelopment"
      class="mira-breakpoint-info"
    >
      <span>{{ currentBreakpoint }}</span>
      <span>{{ containerWidth }}px</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'

// 节流工具函数
const throttle = <T extends (...args: any[]) => void>(fn: T, delay: number): T => {
  let lastCall = 0
  let timeoutId: number | null = null
  return ((...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastCall >= delay) {
      fn(...args)
      lastCall = now
    } else if (timeoutId === null) {
      timeoutId = window.setTimeout(() => {
        fn(...args)
        lastCall = Date.now()
        timeoutId = null
      }, delay - (now - lastCall))
    }
  }) as T
}

// 断点定义
const BREAKPOINTS = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
} as const

type Breakpoint = keyof typeof BREAKPOINTS
type LayoutType = 'stack' | 'grid' | 'flex' | 'sidebar' | 'header-sidebar' | 'three-column'
type Spacing = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'
type Alignment = 'start' | 'center' | 'end' | 'stretch'

// Props
interface Props {
  layout?: LayoutType
  spacing?: Spacing
  alignment?: Alignment
  sidebarWidth?: string
  sidebarPosition?: 'left' | 'right'
  sidebarCollapsible?: boolean
  sidebarCollapsed?: boolean
  headerHeight?: string
  footerHeight?: string
  responsive?: boolean
  breakpoints?: Partial<Record<Breakpoint, LayoutType>>
  minWidth?: string
  maxWidth?: string
  showBreakpointInfo?: boolean
  mobileBreakpoint?: Breakpoint
}

const props = withDefaults(defineProps<Props>(), {
  layout: 'flex',
  spacing: 'md',
  alignment: 'stretch',
  sidebarWidth: '280px',
  sidebarPosition: 'left',
  sidebarCollapsible: true,
  sidebarCollapsed: false,
  headerHeight: 'auto',
  footerHeight: 'auto',
  responsive: true,
  showBreakpointInfo: false,
  mobileBreakpoint: 'lg'
})

// Emits
const emit = defineEmits<{
  breakpointChange: [breakpoint: Breakpoint]
  sidebarToggle: [collapsed: boolean]
  resize: [dimensions: { width: number; height: number }]
}>()

// 响应式引用
const containerRef = ref<HTMLElement>()
const containerWidth = ref(0)
const containerHeight = ref(0)
const isMobile = ref(false)
const showMobileOverlay = ref(false)

// 计算属性
const isDevelopment = computed(() => {
  return import.meta.env.DEV
})

const currentBreakpoint = computed((): Breakpoint => {
  const width = containerWidth.value
  
  if (width >= BREAKPOINTS['2xl']) return '2xl'
  if (width >= BREAKPOINTS.xl) return 'xl'
  if (width >= BREAKPOINTS.lg) return 'lg'
  if (width >= BREAKPOINTS.md) return 'md'
  if (width >= BREAKPOINTS.sm) return 'sm'
  return 'xs'
})

const currentLayout = computed((): LayoutType => {
  if (!props.responsive) return props.layout
  
  const breakpoint = currentBreakpoint.value
  return props.breakpoints?.[breakpoint] || props.layout
})

const sidebarClass = computed(() => {
  const classes: string[] = []
  
  classes.push(`mira-sidebar-${props.sidebarPosition}`)
  
  if (isMobile.value && props.sidebarCollapsible) {
    classes.push('mira-sidebar-mobile')
  }
  
  return classes
})

const mainContentClass = computed(() => {
  const classes: string[] = []
  
  if (currentLayout.value.includes('sidebar')) {
    classes.push('mira-main-with-sidebar')
  }
  
  if (currentLayout.value.includes('header')) {
    classes.push('mira-main-with-header')
  }
  
  return classes
})

const headerClass = computed(() => {
  return currentLayout.value.includes('header') ? 'mira-header-sticky' : ''
})

// 方法
const toggleSidebar = () => {
  const newCollapsed = !props.sidebarCollapsed
  
  if (isMobile.value) {
    showMobileOverlay.value = !showMobileOverlay.value
  }
  
  emit('sidebarToggle', newCollapsed)
}

const closeMobileSidebar = () => {
  showMobileOverlay.value = false
  emit('sidebarToggle', true)
}

const getBreakpointValue = (breakpoint: Breakpoint): number => {
  return BREAKPOINTS[breakpoint]
}

const isBreakpointActive = (breakpoint: Breakpoint): boolean => {
  return containerWidth.value >= BREAKPOINTS[breakpoint]
}

// ResizeObserver
let resizeObserver: ResizeObserver | null = null

// 节流的 resize 处理
const throttledResize = throttle(() => {
  if (!containerRef.value) return

  const rect = containerRef.value.getBoundingClientRect()
  const newWidth = rect.width
  const newHeight = rect.height

  // 只在尺寸真正变化时更新
  if (newWidth !== containerWidth.value || newHeight !== containerHeight.value) {
    containerWidth.value = newWidth
    containerHeight.value = newHeight

    // 检查是否为移动设备
    const mobileThreshold = BREAKPOINTS[props.mobileBreakpoint]
    const wasMobile = isMobile.value
    isMobile.value = newWidth < mobileThreshold

    // 如果从桌面切换到移动端，关闭侧边栏覆盖层
    if (!wasMobile && isMobile.value) {
      showMobileOverlay.value = false
    }

    emit('resize', { width: newWidth, height: newHeight })
  }
}, 100) // 100ms 节流

const setupResizeObserver = () => {
  if (!containerRef.value) return

  // 使用 ResizeObserver 监听容器尺寸变化
  // box: 'border-box' 减少不必要的触发
  resizeObserver = new ResizeObserver(() => {
    throttledResize()
  })

  resizeObserver.observe(containerRef.value, { box: 'border-box' })
}

// 生命周期
onMounted(() => {
  nextTick(() => {
    updateDimensions()
    setupResizeObserver()
    // 初始化移动设备状态
    const mobileThreshold = BREAKPOINTS[props.mobileBreakpoint]
    isMobile.value = containerWidth.value < mobileThreshold
  })
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})

// 监听断点变化
watch(currentBreakpoint, (newBreakpoint, oldBreakpoint) => {
  if (newBreakpoint !== oldBreakpoint) {
    emit('breakpointChange', newBreakpoint)
  }
})

// 暴露方法
defineExpose({
  toggleSidebar,
  getCurrentBreakpoint: () => currentBreakpoint.value,
  getContainerSize: () => ({ width: containerWidth.value, height: containerHeight.value }),
  isBreakpointActive,
  getBreakpointValue
})
</script>

<style scoped>
.mira-responsive-layout {
  width: 100%;
  height: 100%;
  position: relative;
}

/* 布局类型 */
.mira-layout-stack {
  display: flex;
  flex-direction: column;
}

.mira-layout-grid {
  display: grid;
  grid-template-areas: 
    "header header"
    "sidebar main"
    "footer footer";
  grid-template-rows: auto 1fr auto;
  grid-template-columns: auto 1fr;
}

.mira-layout-flex {
  display: flex;
  flex-direction: row;
  align-items: stretch;
}

.mira-layout-sidebar {
  display: flex;
  flex-direction: row;
}

.mira-layout-header-sidebar {
  display: grid;
  grid-template-areas: 
    "header header"
    "sidebar main";
  grid-template-rows: auto 1fr;
  grid-template-columns: auto 1fr;
}

.mira-layout-three-column {
  display: grid;
  grid-template-columns: auto 1fr auto;
  grid-template-areas: "sidebar main aside";
}

/* 间距 */
.mira-spacing-none {
  gap: 0;
}

.mira-spacing-xs {
  gap: var(--mira-space-1);
}

.mira-spacing-sm {
  gap: var(--mira-space-2);
}

.mira-spacing-md {
  gap: var(--mira-space-4);
}

.mira-spacing-lg {
  gap: var(--mira-space-6);
}

.mira-spacing-xl {
  gap: var(--mira-space-8);
}

/* 对齐 */
.mira-align-start {
  align-items: flex-start;
}

.mira-align-center {
  align-items: center;
}

.mira-align-end {
  align-items: flex-end;
}

.mira-align-stretch {
  align-items: stretch;
}

/* 组件样式 */
.mira-header {
  grid-area: header;
  z-index: 10;
}

.mira-header-sticky {
  position: sticky;
  top: 0;
}

.mira-sidebar {
  grid-area: sidebar;
  min-width: v-bind(sidebarWidth);
  background-color: var(--mira-bg-primary);
  border-right: 1px solid var(--mira-border-primary);
  transition: all var(--mira-transition-normal);
}

.mira-sidebar-right {
  order: 2;
  border-right: none;
  border-left: 1px solid var(--mira-border-primary);
}

.mira-sidebar-collapsed {
  min-width: 60px;
  overflow: hidden;
}

.mira-sidebar-mobile {
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  z-index: 100;
  transform: translateX(-100%);
}

.mira-sidebar-mobile.mira-sidebar-right {
  left: auto;
  right: 0;
  transform: translateX(100%);
}

.mira-main-content {
  grid-area: main;
  flex: 1;
  overflow: auto;
  min-width: 0; /* 防止flex子项溢出 */
}

.mira-footer {
  grid-area: footer;
  z-index: 10;
}

.mira-footer-sticky {
  position: sticky;
  bottom: 0;
}

.mira-mobile-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 99;
  opacity: 0;
  visibility: hidden;
  transition: all var(--mira-transition-normal);
}

.mira-mobile-overlay.visible {
  opacity: 1;
  visibility: visible;
}

/* 断点信息 */
.mira-breakpoint-info {
  position: fixed;
  top: var(--mira-space-4);
  right: var(--mira-space-4);
  background-color: var(--mira-primary-500);
  color: white;
  padding: var(--mira-space-2) var(--mira-space-3);
  border-radius: var(--mira-radius-md);
  font-size: var(--mira-text-xs);
  font-weight: 600;
  z-index: 1000;
  display: flex;
  gap: var(--mira-space-2);
  pointer-events: none;
}

/* 响应式调整 */
@media (max-width: 1023px) {
  .mira-layout-sidebar,
  .mira-layout-header-sidebar {
    grid-template-columns: 1fr;
    grid-template-areas: 
      "header"
      "main"
      "footer";
  }
  
  .mira-sidebar {
    display: none;
  }
  
  .mira-sidebar-mobile {
    display: block;
  }
}

@media (max-width: 767px) {
  .mira-layout-grid,
  .mira-layout-three-column {
    grid-template-columns: 1fr;
    grid-template-areas: 
      "header"
      "main"
      "footer";
  }
  
  .mira-spacing-lg {
    gap: var(--mira-space-4);
  }
  
  .mira-spacing-xl {
    gap: var(--mira-space-6);
  }
}

/* 暗色主题 */
.dark .mira-sidebar {
  background-color: var(--mira-bg-secondary);
  border-color: var(--mira-border-primary);
}

/* 高对比度主题 */
.high-contrast .mira-sidebar {
  border-width: 2px;
}

/* 无障碍访问 */
@media (prefers-reduced-motion: reduce) {
  .mira-sidebar,
  .mira-mobile-overlay {
    transition: none;
  }
}
</style>
