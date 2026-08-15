<template>
  <div class="w-full h-screen flex flex-col bg-accent">
    <!-- 加载状态 -->
    <div v-if="isLoading" class="flex flex-col justify-center items-center h-full gap-4">
      <div class="loading-spinner"></div>
      <p>{{ $t('views.filePreviewView.loading') }}</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="flex justify-center items-center h-full">
      <div class="text-center p-8 bg-white rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.1)] max-w-[400px]">
        <h3 class="text-destructive mb-4">{{ $t('views.filePreviewView.loadFailed') }}</h3>
        <p>{{ error }}</p>
        <div class="flex justify-center gap-3 mt-4">
          <button @click="router.back()" class="bg-muted text-foreground border-none px-4 py-2 rounded cursor-pointer hover:bg-accent">{{ $t('views.filePreviewView.back') }}</button>
          <button @click="loadFileInfo" class="bg-primary text-white border-none px-4 py-2 rounded cursor-pointer hover:bg-primary">{{ $t('views.filePreviewView.retry') }}</button>
        </div>
      </div>
    </div>

    <!-- 文件预览 -->
    <div v-else-if="fileInfo" class="flex flex-col h-full">
      <!-- 预览区域 -->
      <div class="flex-1 overflow-hidden relative">
        <IframePreview
          v-if="pluginPreviewUrl"
          :src="pluginPreviewUrl"
          :title="fileInfo.name || $t('views.filePreviewView.pluginPreview')"
          :file-info="fileInfo"
        />
        <!-- 根据文件类型渲染不同的预览组件 -->
        <component
          v-else
          :is="previewComponent"
          :file-info="fileInfo"
          @error="handlePreviewError"
          @renamed="handleFileRenamed"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { miraSDKService } from '../services/MiraSDKService'
import { useViewHistoryStore } from '../stores/viewHistory'
import { AUDIO_EXTENSIONS, CONVERTED_IMAGE_EXTENSIONS, VIDEO_EXTENSIONS } from '../utils/fileUtils'
import { getPluginFileFormat, getPluginFileFormats } from '../plugins/instanceManager'

// 导入预览组件
import ImagePreview from '../components/preview/ImagePreview.vue'
import VideoPreview from '../components/preview/VideoPreview.vue'
import AudioPreview from '../components/preview/AudioPreview.vue'
import DocumentPreview from '../components/preview/DocumentPreview.vue'
import DefaultPreview from '../components/preview/DefaultPreview.vue'
import IframePreview from '../components/preview/IframePreview.vue'

// 响应式数据
const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const isLoading = ref(false)
const error = ref('')
const fileInfo = ref<any>(null)
const viewHistoryStore = useViewHistoryStore()

const pluginPreviewUrl = ref('')

const refreshPluginPreviewUrl = async (file: any): Promise<void> => {
  pluginPreviewUrl.value = ''
  const viewerId = route.query.viewer as string | undefined
  if (file?.libraryId && file?.id) {
    try {
      const viewers = await miraSDKService.getPreviewViewers(file.libraryId, file.id)
      const viewer = viewers.find(item => item.viewerId === viewerId) || viewers[0]
      if (viewer?.iframeUrl) {
        pluginPreviewUrl.value = viewer.iframeUrl
        return
      }
    } catch (error) {
      console.warn('服务端预览地址获取失败:', error)
    }
  }

  const format = file
    ? getPluginFileFormats(file).find(item => item.id === viewerId) || getPluginFileFormat(file)
    : undefined
  if (!format?.getPreviewUrl) return
  try {
    pluginPreviewUrl.value = await format.getPreviewUrl(file)
  } catch (error) {
    console.warn('插件预览地址生成失败:', error)
  }
}

// 计算属性：根据文件类型选择预览组件
const previewComponent = computed(() => {
  if (!fileInfo.value?.mimeType) return DefaultPreview

  const mimeType = fileInfo.value.mimeType.toLowerCase()
  const extension = getFileExtension(fileInfo.value.name || fileInfo.value.title || '')

  // 图片文件
  if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico', ...CONVERTED_IMAGE_EXTENSIONS].includes(extension)) {
    return ImagePreview
  }

  // 视频文件
  if (mimeType.startsWith('video/') || VIDEO_EXTENSIONS.includes(extension)) {
    return VideoPreview
  }

  // 音频文件
  if (mimeType.startsWith('audio/') || AUDIO_EXTENSIONS.includes(extension)) {
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

// 加载文件信息
const loadFileInfo = async (): Promise<void> => {
  const fileId = route.query.id as string
  const libraryId = route.query.libraryId as string

  if (!fileId || !libraryId) {
    error.value = t('views.filePreviewView.missingParams')
    return
  }

  try {
    isLoading.value = true
    error.value = ''

    // 先使用query参数创建基础文件信息
    const baseFileInfo = {
      id: fileId,
      title: route.query.title as string || t('views.filePreviewView.unknownFile'),
      name: route.query.title as string || t('views.filePreviewView.unknownFile'),
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

    await refreshPluginPreviewUrl(fileInfo.value)

    // 记录浏览历史（仅成功加载的预览留痕），异常时静默忽略，不影响预览主流程
    try {
      await viewHistoryStore.addViewRecord(fileInfo.value, libraryId)
    } catch (e) {
      console.warn('记录浏览历史失败:', e)
    }

  } catch (err) {
    console.error('❌ 文件信息加载失败:', err)
    error.value = err instanceof Error ? err.message : t('views.filePreviewView.loadInfoFailed')
  } finally {
    isLoading.value = false
  }
}

// 处理预览错误
const handlePreviewError = (errorMessage: string): void => {
  console.error('预览组件错误:', errorMessage)
  error.value = t('views.filePreviewView.previewFailed', { message: errorMessage })
}

const handleFileRenamed = (name: string): void => {
  if (!fileInfo.value) return
  fileInfo.value.name = name
  fileInfo.value.title = name
  router.replace({ query: { ...route.query, title: name } })
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
