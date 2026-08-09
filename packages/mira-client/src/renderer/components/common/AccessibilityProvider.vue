<template>
  <div class="relative">
    <slot />
    
    <!-- 跳转到主内容链接 -->
    <a
      v-if="showSkipLink"
      href="#main-content"
      class="skip-link"
      @click="focusMainContent"
    >
      {{ $t('commonUi.accessibility.skipToMain') }}
    </a>
    
    <!-- 键盘导航提示 -->
    <div 
      v-if="showKeyboardHints && keyboardNavigation"
      class="keyboard-hints"
      role="status"
      aria-live="polite"
    >
      <div v-if="currentFocus" class="text-center">
        {{ $t('commonUi.accessibility.keyboardHint') }}
      </div>
    </div>
    
    <!-- 屏幕阅读器公告区域 -->
    <div
      ref="announcementRef"
      class="sr-only"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {{ announcement }}
    </div>
    
    <!-- 焦点陷阱（用于模态框等） -->
    <div
      v-if="trapFocus"
      ref="focusTrapStart"
      tabindex="0"
      @focus="onTrapFocus('end')"
      class="sr-only"
    ></div>
    
    <div
      v-if="trapFocus"
      ref="focusTrapEnd"
      tabindex="0"
      @focus="onTrapFocus('start')"
      class="sr-only"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, provide } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// 无障碍访问上下文
const AccessibilityKey = Symbol('accessibility')

interface AccessibilityContext {
  announce: (message: string) => void
  focusElement: (selector: string) => void
  setTrapFocus: (enabled: boolean) => void
  isReducedMotion: boolean
  isHighContrast: boolean
  prefersColorScheme: 'light' | 'dark' | 'no-preference'
}

// Props
interface Props {
  showSkipLink?: boolean
  showKeyboardHints?: boolean
  trapFocus?: boolean
  enableFocusManagement?: boolean
  announceRouteChanges?: boolean
  respectReducedMotion?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showSkipLink: true,
  showKeyboardHints: false,
  trapFocus: false,
  enableFocusManagement: true,
  announceRouteChanges: true,
  respectReducedMotion: true
})

// 响应式状态
const announcementRef = ref<HTMLElement>()
const focusTrapStart = ref<HTMLElement>()
const focusTrapEnd = ref<HTMLElement>()
const announcement = ref('')
const currentFocus = ref<Element | null>(null)
const keyboardNavigation = ref(false)
const isReducedMotion = ref(false)
const isHighContrast = ref(false)
const prefersColorScheme = ref<'light' | 'dark' | 'no-preference'>('no-preference')

// 媒体查询
let reducedMotionQuery: MediaQueryList | null = null
let highContrastQuery: MediaQueryList | null = null
let colorSchemeQuery: MediaQueryList | null = null

// 方法
const announce = (message: string) => {
  announcement.value = message
  
  // 清除消息以允许重复公告
  setTimeout(() => {
    announcement.value = ''
  }, 1000)
}

const focusElement = (selector: string) => {
  nextTick(() => {
    const element = document.querySelector(selector) as HTMLElement
    if (element) {
      element.focus()
    }
  })
}

const focusMainContent = () => {
  const mainElement = document.querySelector('#main-content, main, [role="main"]') as HTMLElement
  if (mainElement) {
    mainElement.focus()
    mainElement.scrollIntoView({ behavior: 'smooth' })
  }
}

const setTrapFocus = (_enabled: boolean) => {
  // 这个方法可以被父组件调用来启用/禁用焦点陷阱
}

const onTrapFocus = (direction: 'start' | 'end') => {
  if (!props.trapFocus) return
  
  const focusableElements = document.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  
  if (focusableElements.length === 0) return
  
  if (direction === 'start') {
    (focusableElements[focusableElements.length - 1] as HTMLElement).focus()
  } else {
    (focusableElements[0] as HTMLElement).focus()
  }
}

// 键盘事件处理
const handleKeydown = (event: KeyboardEvent) => {
  keyboardNavigation.value = true
  
  // ESC 键处理
  if (event.key === 'Escape') {
    const activeElement = document.activeElement as HTMLElement
    if (activeElement && activeElement.blur) {
      activeElement.blur()
    }
  }
  
  // Tab 键导航提示
  if (event.key === 'Tab') {
    setTimeout(() => {
      currentFocus.value = document.activeElement
    }, 0)
  }
}

const handleMousedown = () => {
  keyboardNavigation.value = false
}

const handleFocusIn = (event: FocusEvent) => {
  currentFocus.value = event.target as Element
}

const handleFocusOut = () => {
  currentFocus.value = null
}

// 媒体查询处理
const setupMediaQueries = () => {
  // 减少动画偏好
  if (window.matchMedia) {
    reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    isReducedMotion.value = reducedMotionQuery.matches
    
    const handleReducedMotionChange = (e: MediaQueryListEvent) => {
      isReducedMotion.value = e.matches
      // 减少动画的强制 0ms 由全局 @media (prefers-reduced-motion: reduce) 规则覆盖
      // （见 App.vue / theme.css 的全局规则），此处仅维护响应式状态。
    }
    
    reducedMotionQuery.addEventListener('change', handleReducedMotionChange)
    handleReducedMotionChange({ matches: reducedMotionQuery.matches } as MediaQueryListEvent)
  }
  
  // 高对比度偏好
  if (window.matchMedia) {
    highContrastQuery = window.matchMedia('(prefers-contrast: high)')
    isHighContrast.value = highContrastQuery.matches
    
    const handleHighContrastChange = (e: MediaQueryListEvent) => {
      isHighContrast.value = e.matches
      if (e.matches) {
        document.documentElement.classList.add('high-contrast')
      } else {
        document.documentElement.classList.remove('high-contrast')
      }
    }
    
    highContrastQuery.addEventListener('change', handleHighContrastChange)
    handleHighContrastChange({ matches: highContrastQuery.matches } as MediaQueryListEvent)
  }
  
  // 色彩方案偏好
  if (window.matchMedia) {
    colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)')
    prefersColorScheme.value = colorSchemeQuery.matches ? 'dark' : 'light'
    
    const handleColorSchemeChange = (e: MediaQueryListEvent) => {
      prefersColorScheme.value = e.matches ? 'dark' : 'light'
    }
    
    colorSchemeQuery.addEventListener('change', handleColorSchemeChange)
  }
}

const cleanupMediaQueries = () => {
  if (reducedMotionQuery) {
    reducedMotionQuery.removeEventListener('change', () => {})
  }
  if (highContrastQuery) {
    highContrastQuery.removeEventListener('change', () => {})
  }
  if (colorSchemeQuery) {
    colorSchemeQuery.removeEventListener('change', () => {})
  }
}

// 路由变化公告
const announceRouteChange = (to: any) => {
  if (props.announceRouteChanges && to.meta?.title) {
    announce(t('commonUi.accessibility.navigatedTo', { title: to.meta.title }))
  }
}

// 生命周期
onMounted(() => {
  if (props.enableFocusManagement) {
    document.addEventListener('keydown', handleKeydown)
    document.addEventListener('mousedown', handleMousedown)
    document.addEventListener('focusin', handleFocusIn)
    document.addEventListener('focusout', handleFocusOut)
  }
  
  setupMediaQueries()
  
  // 初始化时的公告
  nextTick(() => {
    announce(t('commonUi.accessibility.pageLoaded'))
  })
})

onUnmounted(() => {
  if (props.enableFocusManagement) {
    document.removeEventListener('keydown', handleKeydown)
    document.removeEventListener('mousedown', handleMousedown)
    document.removeEventListener('focusin', handleFocusIn)
    document.removeEventListener('focusout', handleFocusOut)
  }
  
  cleanupMediaQueries()
})

// 提供无障碍访问上下文
const accessibilityContext: AccessibilityContext = {
  announce,
  focusElement,
  setTrapFocus,
  isReducedMotion: isReducedMotion.value,
  isHighContrast: isHighContrast.value,
  prefersColorScheme: prefersColorScheme.value
}

provide(AccessibilityKey, accessibilityContext)

// 暴露路由变化公告方法
defineExpose({
  announce,
  focusElement,
  focusMainContent,
  setTrapFocus,
  announceRouteChange
})
</script>

<style scoped>
/* 跳转链接 */
.skip-link {
  position: absolute;
  top: -40px;
  left: 6px;
  background: var(--ring);
  color: white;
  padding: 8px;
  border-radius: 4px;
  text-decoration: none;
  z-index: 1000;
  transition: top 0.2s ease;
}

.skip-link:focus {
  top: 6px;
}

/* 键盘导航提示 */
.keyboard-hints {
  position: fixed;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  background: var(--foreground);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  z-index: 1000;
  opacity: 0;
  visibility: hidden;
  transition: all 250ms ease;
  pointer-events: none;
}

.keyboard-hints.visible {
  opacity: 1;
  visibility: visible;
}

/* 屏幕阅读器专用 */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* 焦点样式增强 */
:global(:focus-visible) {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

/* 高对比度模式增强 */
:global(.high-contrast) {
  --border: #000000;
  --foreground: #000000;
  --background: #ffffff;
}

:global(.high-contrast .skip-link) {
  background: #000000;
  color: #ffffff;
  border: 2px solid #ffffff;
}

:global(.high-contrast .keyboard-hints) {
  background: #000000;
  color: #ffffff;
  border: 2px solid #ffffff;
}

/* 减少动画模式 */
:global(.reduced-motion) *,
:global(.reduced-motion) *::before,
:global(.reduced-motion) *::after {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
  scroll-behavior: auto !important;
}

/* 触屏设备优化 */
@media (hover: none) and (pointer: coarse) {
  .skip-link {
    padding: 12px 16px;
    font-size: 16px;
  }
}

/* 打印样式 */
@media print {
  .skip-link,
  .keyboard-hints {
    display: none !important;
  }
}
</style>
