<template>
  <transition
    name="loading-fade"
    enter-active-class="transition-opacity duration-300 ease-out"
    leave-active-class="transition-opacity duration-200 ease-in"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div 
      v-if="isVisible" 
      class="global-loading fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm dark:bg-black/60"
      @click.stop
    >
      <div class="bg-white dark:bg-muted dark:text-white rounded-lg shadow-2xl p-8 max-w-sm mx-4 text-center max-sm:max-w-[20rem] max-sm:p-6">
        <!-- 加载动画 -->
        <div class="mb-6">
          <div class="relative mx-auto w-16 h-16">
            <!-- 外圈旋转动画 -->
            <div class="absolute inset-0 rounded-full border-4 border-border"></div>
            <div class="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
            
            <!-- 内部脉冲动画 -->
            <div class="absolute inset-2 rounded-full bg-primary animate-pulse opacity-75"></div>
            
            <!-- 中心点 -->
            <div class="absolute inset-6 rounded-full bg-primary"></div>
          </div>
        </div>
        
        <!-- 加载信息 -->
        <div class="space-y-3">
          <h3 class="text-lg max-sm:text-base font-semibold text-foreground dark:text-muted-foreground">
            {{ title || $t('commonUi.globalLoading.defaultTitle') }}
          </h3>
          <p v-if="message" class="text-sm text-muted-foreground dark:text-muted-foreground leading-relaxed">
            {{ message }}
          </p>
          
          <!-- 进度条（可选） -->
          <div v-if="showProgress && progress !== undefined" class="mt-4">
            <div class="flex justify-between text-xs text-muted-foreground dark:text-muted-foreground mb-1">
              <span>{{ $t('commonUi.globalLoading.progress') }}</span>
              <span>{{ Math.round(progress) }}%</span>
            </div>
            <div class="w-full bg-accent dark:bg-muted rounded-full h-2">
              <div 
                class="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
                :style="{ width: `${Math.min(100, Math.max(0, progress))}%` }"
              ></div>
            </div>
          </div>
          
          <!-- 额外操作按钮 -->
          <div v-if="showCancel" class="mt-6">
            <button
              @click="handleCancel"
              class="px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:text-muted-foreground dark:hover:bg-muted rounded-md transition-colors"
            >
              {{ $t('commonUi.globalLoading.cancel') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">

// Props
interface Props {
  isVisible?: boolean
  title?: string
  message?: string
  progress?: number
  showProgress?: boolean
  showCancel?: boolean
}

withDefaults(defineProps<Props>(), {
  isVisible: false,
  title: '',
  message: '',
  progress: undefined,
  showProgress: false,
  showCancel: false
})

// Emits
const emit = defineEmits<{
  cancel: []
}>()

// Methods
const handleCancel = () => {
  emit('cancel')
}
</script>

<style scoped>
@keyframes pulse-scale {
  0%, 100% {
    transform: scale(1);
    opacity: 0.75;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.9;
  }
}

.animate-pulse {
  animation: pulse-scale 2s ease-in-out infinite;
}

@media (prefers-contrast: high) {
  .global-loading {
    backdrop-filter: none;
    background-color: rgba(0, 0, 0, 0.8);
  }

  .global-loading .bg-white {
    border: 2px solid rgb(31, 41, 55);
  }
}

@media (prefers-reduced-motion: reduce) {
  .animate-spin,
  .animate-pulse {
    animation: none;
  }

  .transition-opacity {
    transition: none;
  }
}
</style>
