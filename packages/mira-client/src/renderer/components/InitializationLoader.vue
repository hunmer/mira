<template>
  <div 
    v-if="shouldShow" 
    class="fixed inset-0 flex items-center justify-center z-50 initialization-overlay"
    :class="{ 'fade-out': isComplete }"
  >
    <div class="text-center">
      <!-- Loading 图标 -->
      <div 
        v-if="!error && !isComplete"
        class="custom-loader mx-auto"
      ></div>
      
      <!-- 完成图标 -->
      <div v-if="isComplete" class="text-green-500 text-6xl mb-4">✓</div>
      
      <!-- 错误图标 -->
      <div v-if="error" class="text-red-500 text-6xl mb-4">✗</div>
      
      <!-- 状态文本 -->
      <p class="text-white text-lg mt-4">
        {{ error || loadingMessage }}
      </p>
      
      <!-- 错误时的重试按钮 -->
      <div v-if="error" class="mt-6 space-x-4">
        <button 
          @click="handleRetry"
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          重试
        </button>
        <button 
          @click="handleGoToLogin"
          class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
        >
          前往登录
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

interface Props {
  isVisible: boolean
  error?: string | null
  autoInitialize?: boolean
  connectionStatus?: 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting'
  isLoading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  error: null,
  autoInitialize: true,
  connectionStatus: undefined,
  isLoading: false
})

const emit = defineEmits<{
  retry: []
  cancel: []
  completed: []
  failed: [error: string]
}>()

const router = useRouter()
const route = useRoute()

// 状态
const loadingMessage = ref('正在检查上次连接的素材库...')

const error = ref<string | null>(props.error)
const isComplete = ref(false)
const isRedirecting = ref(false)
const isGlobalLoading = computed(() => props.isLoading || props.connectionStatus === 'connecting')

// 计算是否应该显示组件
const shouldShow = computed(() => {
  return (props.isVisible || isGlobalLoading.value) && !isRedirecting.value
})

// 执行实际的初始化流程
const performInitialization = async () => {
  try {
    error.value = null
    isComplete.value = false

    // 使用 InitializationService 执行初始化
    const { initializationService } = await import('../services/InitializationService')

    const result = await initializationService.performInitialization((message: string) => {
      loadingMessage.value = message
    })

    if (!result.success) {
      throw new Error(result.error || '初始化失败')
    }

    // 步骤 4: 完成
    loadingMessage.value = '初始化完成'

    isComplete.value = true
    emit('completed')

    // 等待淡出动画完成后再跳转
    setTimeout(() => {
      const redirect = route.query.redirect as string
      router.push(redirect || '/')
    }, 1500) // 延迟1.5秒，给淡出动画时间

  } catch (err) {
    // 如果是认证失败，直接跳转到登录页面，不显示错误
    if (err instanceof Error && err.message.includes('Authentication failed')) {
      console.log('🔄 Authentication failed, redirecting to login...')
      isRedirecting.value = true
      emit('cancel')

      const redirect = route.query.redirect as string
      router.push({ name: 'Login', query: redirect ? { redirect } : {} })
      return
    }

    const errorMessage = err instanceof Error ? err.message : '初始化失败'
    error.value = errorMessage
    isComplete.value = false
    emit('failed', errorMessage)
  }
}

// 处理重试
const handleRetry = () => {
  error.value = null
  isComplete.value = false
  isRedirecting.value = false
  loadingMessage.value = '正在重新连接...'
  performInitialization()
  emit('retry')
}

// 前往登录
const handleGoToLogin = () => {
  // 设置重定向状态，隐藏初始化组件
  isRedirecting.value = true
  error.value = null
  isComplete.value = false
  emit('cancel') // 发出取消事件
  
  const redirect = route.query.redirect as string
  router.push({ name: 'Login', query: redirect ? { redirect } : {} })
}

// 监听 props 变化
watch(() => props.error, (newError: string | null | undefined) => {
  error.value = newError || null
})

onMounted(() => {
  if (props.autoInitialize && props.isVisible) {
    // 开始初始化流程
    performInitialization()
    
    // 设置超时机制
    setTimeout(() => {
      if (!error.value && !isComplete.value) {
        error.value = '连接超时，请检查网络连接或服务器状态'
        isComplete.value = false
      }
    }, 15000) // 15秒超时
  }
})
</script>

<style scoped>
.initialization-overlay {
  background-color: rgba(0, 0, 0, 0.3);
  transition: opacity 0.5s ease-out;
}

.fade-out {
  opacity: 0;
}

.custom-loader {
    width: 50px;
    height: 50px;
    display: grid;
    position: relative;
}
.custom-loader::before,
.custom-loader::after {    
    content: "";
    grid-area: 1/1;
    --c: radial-gradient(farthest-side, #766DF4 92%, transparent);
    background: 
      var(--c) 50%  0, 
      var(--c) 50%  100%, 
      var(--c) 100% 50%, 
      var(--c) 0    50%;
    background-size: 12px 12px;
    background-repeat: no-repeat;
    animation: s2 2s infinite linear;
}
.custom-loader::before {
    margin: 4px;
    filter: hue-rotate(45deg);
    background-size: 8px 8px;
    animation-timing-function: linear;
}

@keyframes s2{ 
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
</style>
