<template>
  <div class="w-full h-screen flex flex-col bg-accent">
    <!-- 加载状态 -->
    <div v-if="isLoading" class="flex flex-col justify-center items-center h-full gap-4">
      <div class="loading-spinner"></div>
      <p>正在加载文件信息...</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="flex justify-center items-center h-full">
      <div class="text-center p-8 bg-white rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.1)] max-w-[400px]">
        <h3 class="text-destructive mb-4">加载失败</h3>
        <p>{{ error }}</p>
        <button @click="loadFileInfo" class="bg-primary text-white border-none px-4 py-2 rounded cursor-pointer mt-4 hover:bg-primary">重试</button>
      </div>
    </div>

    <!-- 文件预览 -->
    <div v-else-if="fileInfo" class="flex flex-col h-full">
      <!-- 预览区域 -->
      <div class="flex-1 overflow-hidden relative">
        <!-- 根据文件类型渲染不同的预览组件 -->
        <component
          :is="previewComponent"
          :file-info="fileInfo"
          @error="handlePreviewError"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { miraSDKService } from '../services/MiraSDKService'
import { useViewHistoryStore } from '../stores/viewHistory'

// 导入预览组件
import ImagePreview from '../components/preview/ImagePreview.vue'
import VideoPreview from '../components/preview/VideoPreview.vue'
import AudioPreview from '../components/preview/AudioPreview.vue'
import DocumentPreview from '../components/preview/DocumentPreview.vue'
import DefaultPreview from '../components/preview/DefaultPreview.vue'

// 响应式数据
const route = useRoute()
const isLoading = ref(false)
const error = ref('')
const fileInfo = ref<any>(null)
const viewHistoryStore = useViewHistoryStore()

// 计算属性：根据文件类型选择预览组件
const previewComponent = computed(() => {
  if (!fileInfo.value?.mimeType) return DefaultPreview

  const mimeType = fileInfo.value.mimeType.toLowerCase()
  const extension = getFileExtension(fileInfo.value.name || fileInfo.value.title || '')

  // 图片文件
  if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(extension)) {
    return ImagePreview
  }

  // 视频文件
  if (mimeType.startsWith('video/') || ['mp4', 'webm', 'ogg', 'avi', 'mov', 'wmv', 'flv', 'mkv'].includes(extension)) {
    return VideoPreview
  }

  // 音频文件
  if (mimeType.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'].includes(extension)) {
    return AudioPreview
  }

  // 文档文件
  if (mimeType.includes('pdf') || 
      mimeType.includes('document') || 
      mimeType.includes('text') ||
      ['pdf', 'doc', 'docx', 'txt', 'md', 'rtf'].includes(extension)) {
    return DocumentPreview
  }

  // 默认预览
  return DefaultPreview
})

// 获取文件扩展名
const getFileExtension = (filename: string): string => {
  const lastDotIndex = filename.lastIndexOf('.')
  return lastDotIndex > 0 ? filename.substring(lastDotIndex + 1).toLowerCase() : ''
}

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// 格式化日期
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return dateString
  }
}

// 加载文件信息
const loadFileInfo = async (): Promise<void> => {
  const fileId = route.query.id as string
  const libraryId = route.query.libraryId as string

  if (!fileId || !libraryId) {
    error.value = '缺少必要的文件ID或库ID参数'
    return
  }

  try {
    isLoading.value = true
    error.value = ''

    // 先使用query参数创建基础文件信息
    const baseFileInfo = {
      id: fileId,
      title: route.query.title as string || '未知文件',
      name: route.query.title as string || '未知文件',
      mimeType: route.query.mimeType as string || '',
      path: route.query.path as string || '',
      url: route.query.path as string || '',
      libraryId: libraryId,
      size: 0,
      updatedAt: new Date().toISOString()
    }

    // 尝试从SDK获取更详细的文件信息
    try {
      // 直接使用getFile方法获取单个文件信息，比查询所有文件更高效
      const foundFile = await miraSDKService.getFile(libraryId, fileId)
      if (foundFile) {
        // 合并SDK返回的信息和query参数
        fileInfo.value = {
          ...baseFileInfo,
          ...foundFile,
          // query参数优先级更高
          title: baseFileInfo.title,
          mimeType: baseFileInfo.mimeType || foundFile.mimeType,
          path: baseFileInfo.path || foundFile.url || foundFile.path
        }
      } else {
        fileInfo.value = baseFileInfo
      }
    } catch (sdkError) {
      console.warn('SDK获取文件信息失败，使用基础信息:', sdkError)
      fileInfo.value = baseFileInfo
    }

    // 记录浏览历史（仅成功加载的预览留痕），异常时静默忽略，不影响预览主流程
    try {
      await viewHistoryStore.addViewRecord(fileInfo.value, libraryId)
    } catch (e) {
      console.warn('记录浏览历史失败:', e)
    }

    console.log('✅ 文件信息加载成功:', fileInfo.value)
  } catch (err) {
    console.error('❌ 文件信息加载失败:', err)
    error.value = err instanceof Error ? err.message : '加载文件信息失败'
  } finally {
    isLoading.value = false
  }
}

// 处理预览错误
const handlePreviewError = (errorMessage: string): void => {
  console.error('预览组件错误:', errorMessage)
  error.value = `文件预览失败: ${errorMessage}`
}

// 监听路由变化
watch(() => route.query, () => {
  loadFileInfo()
}, { immediate: false })

// 组件挂载时加载文件信息
onMounted(() => {
  loadFileInfo()
})
</script>

<style scoped>
.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e1e1e1;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
