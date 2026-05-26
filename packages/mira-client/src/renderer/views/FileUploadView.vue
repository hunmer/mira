<template>
  <div class="h-screen bg-gray-50 dark:bg-gray-900 overflow-y-auto">
    <main class="flex-1 p-8">
      <!-- 页面头部 -->
      <div class="flex items-center justify-between mb-6">
        <router-link
          to="/"
          class="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 transition-colors"
        >
          <span class="material-icons mr-2">arrow_back_ios</span>
          返回主页
        </router-link>

        <!-- 素材库选择器 -->
        <div class="flex items-center space-x-2">
          <span class="text-sm text-gray-600 dark:text-gray-400">素材库:</span>
          <Select v-model="selectedLibraryId" @update:model-value="handleLibrarySelectChange">
            <SelectTrigger class="w-48">
              <SelectValue placeholder="选择素材库" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="lib in libraryOptions" :key="lib.id" :value="lib.id">{{ lib.name }}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <!-- 队列状态显示 -->
      <div v-if="queueStats.pending > 0 || queueStats.running > 0" class="mb-6">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">上传队列状态</h3>
        <div class="bg-blue-50 p-4 rounded-lg">
          <div class="grid grid-cols-4 gap-4 text-center">
            <div>
              <div class="text-2xl font-bold text-blue-600">{{ queueStats.pending }}</div>
              <div class="text-sm text-gray-600 dark:text-gray-400">等待中</div>
            </div>
            <div>
              <div class="text-2xl font-bold text-orange-600">{{ queueStats.running }}</div>
              <div class="text-sm text-gray-600 dark:text-gray-400">上传中</div>
            </div>
            <div>
              <div class="text-2xl font-bold text-green-600">{{ queueStats.completed }}</div>
              <div class="text-sm text-gray-600 dark:text-gray-400">已完成</div>
            </div>
            <div>
              <div class="text-2xl font-bold text-red-600">{{ queueStats.failed }}</div>
              <div class="text-sm text-gray-600 dark:text-gray-400">失败</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 多标签页文件上传组件 -->
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm mb-8">
        <MultiTabFileUpload
          ref="multiTabUploadRef"
          accept="*"
          :max-file-size="10 * 1024 * 1024"
          :max-files="500"
          :auto-upload="false"
          :uploaded-files-list="files"
          :is-loading="isLoading"
          :show-uploaded-files="true"
          @files-selected="handleFilesSelected"
          @upload-start="handleUploadStart"
          @upload-progress="handleUploadProgress"
          @upload-complete="handleUploadComplete"
          @upload-error="handleUploadError"
          @delete-file="deleteFile"
          @clear-all-files="clearAllFiles"
          @refresh-files="refreshFiles"
          @sort-change="handleSortChange"
        />
      </div>

    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useServerListStore } from '../stores/serverList'
import { useMediaStore } from '../stores/media'
import { useUploadHistoryStore } from '../stores/uploadHistory'
import { useToast } from '@/renderer/composables/useToast'
import Queue from 'queue'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { MultiTabFileUpload } from '../components/common'

// 路由和状态管理
const serverListStore = useServerListStore()
const mediaStore = useMediaStore()
const uploadHistoryStore = useUploadHistoryStore()
const toast = useToast()

// 响应式数据
const multiTabUploadRef = ref()
const sortField = ref<'name' | 'size' | 'uploadedAt'>('uploadedAt')
const sortOrder = ref<'asc' | 'desc'>('desc')

// 素材库选择
const selectedLibraryId = ref<string>('')

// 文件数量和大小限制配置
const FILE_LIMITS = {
  MAX_FILES_PER_BATCH: 500,        // 单次最大文件数量
  MAX_CONCURRENT_UPLOADS: 3,      // 同时上传数量
  MAX_TOTAL_SIZE: 1024 * 1024 * 1024, // 1GB 总大小限制
  PROGRESS_UPDATE_INTERVAL: 500   // 进度更新间隔（毫秒）
}

// 上传队列配置 - 使用文件限制中的并发数
const uploadQueue = new Queue({
  concurrency: FILE_LIMITS.MAX_CONCURRENT_UPLOADS,
  timeout: 60000,  // 增加到60秒超时
  autostart: true
})

// 队列状态
const queueStats = ref({
  pending: 0,
  running: 0,
  completed: 0,
  failed: 0
})

// 队列事件监听
uploadQueue.addEventListener('start', () => {
  updateQueueStats()
})

uploadQueue.addEventListener('success', () => {
  queueStats.value.completed++
  updateQueueStats()
})

uploadQueue.addEventListener('error', () => {
  queueStats.value.failed++
  updateQueueStats()
})

uploadQueue.addEventListener('end', () => {
  updateQueueStats()
  console.log('Upload queue finished')
})

// 更新队列统计
const updateQueueStats = () => {
  queueStats.value.pending = uploadQueue.length
  queueStats.value.running = uploadQueue.length - queueStats.value.pending
}


// 计算属性
const isLoading = computed(() => uploadHistoryStore.isLoading)

// 素材库选项
const libraryOptions = computed(() => {
  return serverListStore.services.map(lib => ({
    id: lib.id,
    name: lib.name,
    path: lib.serverUrl
  }))
})

// 当前选中的素材库
const currentLibrary = computed(() => {
  return serverListStore.services.find(lib => lib.id === selectedLibraryId.value)
})

// 从本地上传记录读取文件
const files = computed(() => {
  if (selectedLibraryId.value) {
    return uploadHistoryStore.getLibraryRecords(selectedLibraryId.value)
  }
  return uploadHistoryStore.uploadRecords
})


// 多标签页上传组件事件处理
const handleFilesSelected = (files: File[]) => {
  console.log('Files selected via multi-tab upload:', files.length)

  // 文件数量限制检查
  if (files.length > FILE_LIMITS.MAX_FILES_PER_BATCH) {
    toast.add({
      severity: 'warn',
      summary: '文件数量过多',
      detail: `单次最多只能上传 ${FILE_LIMITS.MAX_FILES_PER_BATCH} 个文件`,
      life: 5000
    })
    return
  }

  // 总大小限制检查
  const totalSize = files.reduce((sum, file) => sum + file.size, 0)
  if (totalSize > FILE_LIMITS.MAX_TOTAL_SIZE) {
    toast.add({
      severity: 'warn',
      summary: '文件总大小过大',
      detail: `文件总大小不能超过 ${formatFileSize(FILE_LIMITS.MAX_TOTAL_SIZE)}`,
      life: 5000
    })
    return
  }
}

const handleUploadStart = async (files: File[]) => {
  console.log('Upload start via multi-tab:', files.length)

  if (!currentLibrary.value) {
    toast.add({
      severity: 'error',
      summary: '错误',
      detail: '请先选择一个素材库',
      life: 3000
    })
    return
  }

  // 批量创建上传任务
  const addFilesToQueue = async () => {
    const batchSize = 50

    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, Math.min(i + batchSize, files.length))

      // 添加这批文件到队列
      batch.forEach(file => {
        const uploadJob = createUploadJob(file)
        uploadQueue.push(uploadJob)
      })

      // 每批之间等待一下，让UI有机会更新
      if (i + batchSize < files.length) {
        await new Promise(resolve => setTimeout(resolve, 50))
      }
    }
  }

  addFilesToQueue()
}

const handleUploadProgress = (item: any) => {
  // 进度在组件内部处理，这里可以添加额外逻辑
}

const handleUploadComplete = (item: any) => {
  console.log('Upload complete via multi-tab:', item.file.name)

  // 添加到上传历史记录
  if (currentLibrary.value) {
    uploadHistoryStore.addUploadRecord({
      name: item.file.name,
      size: item.file.size,
      mimeType: item.file.type,
      libraryId: currentLibrary.value.id,
      libraryName: currentLibrary.value.name,
      status: 'success',
      serverId: 'uploaded',
      localPath: item.file.name
    })
  }
}

const handleUploadError = (item: any, error: string) => {
  console.error('Upload error via multi-tab:', error)

  // 添加失败记录到上传历史
  if (currentLibrary.value) {
    uploadHistoryStore.addUploadRecord({
      name: item.file.name,
      size: item.file.size,
      mimeType: item.file.type,
      libraryId: currentLibrary.value.id,
      libraryName: currentLibrary.value.name,
      status: 'failed',
      error: error
    })
  }

  toast.add({
    severity: 'error',
    summary: '上传失败',
    detail: `文件 ${item.file.name}: ${error}`,
    life: 5000
  })
}

// 创建上传任务（兼容原有队列系统）
const createUploadJob = (file: File) => {
  return (callback?: (error?: Error, result?: any) => void) => {
    if (!currentLibrary.value) {
      const error = new Error('请先选择素材库')
      callback?.(error)
      return
    }

    // 执行实际上传
    mediaStore.uploadFile(file, currentLibrary.value.id)
      .then(result => {
        if (result.success) {
          callback?.(undefined, result)
        } else {
          throw new Error(result.error || '上传失败')
        }
      })
      .catch(error => {
        console.error('Upload error:', error)
        callback?.(error)
      })
  }
}

// 文件列表操作 - 读取本地上传记录
const refreshFiles = async () => {
  try {
    // 从本地存储恢复上传历史记录
    uploadHistoryStore.restoreFromStorage()
  } catch (error) {
    console.error('Failed to refresh local files:', error)
    toast.add({
      severity: 'error',
      summary: '刷新失败',
      detail: '无法读取本地上传记录',
      life: 3000
    })
  }
}

const clearAllFiles = async () => {
  if (files.value.length === 0) {
    toast.add({
      severity: 'warn',
      summary: '提示',
      detail: '没有文件可以清空',
      life: 3000
    })
    return
  }

  try {
    // 删除当前库的所有文件记录
    if (selectedLibraryId.value) {
      uploadHistoryStore.clearLibraryRecords(selectedLibraryId.value)
    } else {
      // 清空所有上传记录
      uploadHistoryStore.clearAllRecords()
    }

    selectedFiles.value = []
    selectAll.value = false
    await refreshFiles()
  } catch (error) {
    console.error('Failed to clear files:', error)
    toast.add({
      severity: 'error',
      summary: '清空失败',
      detail: '清空文件时发生错误',
      life: 3000
    })
  }
}

const deleteFile = async (file: any) => {
  if (!currentLibrary.value) return

  try {
    // 删除本地上传记录
    uploadHistoryStore.deleteUploadRecord(file.id)

    await refreshFiles()
  } catch (error) {
    console.error('Failed to delete file:', error)
    toast.add({
      severity: 'error',
      summary: '删除失败',
      detail: `删除文件 ${file.name} 失败`,
      life: 3000
    })
  }
}

// 素材库选择处理
const handleLibraryChange = (event: any) => {
  selectedLibraryId.value = event.value
  // 切换素材库时刷新文件列表
  refreshFiles()
}

const handleLibrarySelectChange = (value: string) => {
  selectedLibraryId.value = value
  // 切换素材库时刷新文件列表
  refreshFiles()
}

// MultiTabFileUpload 排序变化处理
const handleSortChange = (field: string, order: string) => {
  sortField.value = field as 'name' | 'size' | 'uploadedAt'
  sortOrder.value = order as 'asc' | 'desc'
}

// 工具方法
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}



// 生命周期
onMounted(async () => {
  // 确保素材库列表已初始化
  await serverListStore.initializeServerList()

  // 初始化时设置默认素材库
  if (serverListStore.services.length > 0) {
    selectedLibraryId.value = serverListStore.services[0].id
  }

  // 恢复本地上传历史记录
  uploadHistoryStore.restoreFromStorage()
})
</script>

<style scoped>
/* 自定义样式 */
.transition-colors {
  transition: color 0.2s ease-in-out;
}

/* 确保 Material Icons 正确显示 */
.material-icons {
  font-family: 'Material Icons';
  font-weight: normal;
  font-style: normal;
  font-size: 24px;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  -webkit-font-feature-settings: 'liga';
  -webkit-font-smoothing: antialiased;
}

/* 表格行悬停效果 */
tbody tr:hover {
  background-color: #f9fafb;
}

:root.dark tbody tr:hover {
  background-color: #1f2937;
}

/* 按钮悬停效果 */
button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* 加载动画 */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

/* 文件图标大小调整 */
.material-icons.text-sm {
  font-size: 18px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .hidden.sm\\:flex-1 {
    display: none;
  }

  .flex.sm\\:hidden {
    display: flex;
  }

  table {
    font-size: 0.875rem;
  }

  .p-4 {
    padding: 0.75rem;
  }
}
</style>