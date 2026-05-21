<template>
  <Dialog
    :open="isVisible"
    @update:open="handleOpenChange"
  >
    <DialogContent class="file-upload-dialog sm:max-w-[90vw] max-h-[90vh]">
      <DialogHeader>
        <DialogTitle>文件上传</DialogTitle>
      </DialogHeader>
      <div class="file-upload-content h-full flex flex-col">
        <!-- 顶部队列状态 -->
        <div v-if="queueStats.pending > 0 || queueStats.running > 0" class="flex items-center justify-end space-x-4 text-sm mb-4 px-1">
          <span class="text-blue-600">等待中: {{ queueStats.pending }}</span>
          <span class="text-orange-600">上传中: {{ queueStats.running }}</span>
          <span class="text-green-600">已完成: {{ queueStats.completed }}</span>
          <span v-if="queueStats.failed > 0" class="text-red-600">失败: {{ queueStats.failed }}</span>
        </div>

        <!-- 主体内容区域 -->
        <div class="flex-1 flex gap-4 min-h-0">
          <!-- 左侧：上传区域和文件网格 -->
          <div class="flex-1 flex flex-col min-w-0">
            <!-- 隐藏的文件输入 -->
            <input
              ref="fileInputRef"
              type="file"
              multiple
              accept="*"
              class="hidden"
              @change="handleFileSelect"
            />

            <!-- 待上传文件网格 -->
            <div
              class="flex-1 bg-white rounded-xl border-2 overflow-hidden flex flex-col transition-colors"
              :class="isDragOver ? 'border-blue-500 bg-blue-50/30' : 'border-gray-200'"
              @drop.prevent="handleDrop"
              @dragover.prevent="isDragOver = true"
              @dragleave.prevent="isDragOver = false"
            >
              <!-- 文件列表头部 -->
              <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <div class="flex items-center space-x-2">
                  <span class="text-sm font-medium text-gray-700">待上传文件</span>
                  <span v-if="pendingFiles.length > 0" class="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {{ pendingFiles.length }} 个
                  </span>
                </div>
                <div class="flex items-center space-x-2">
                  <button
                    v-if="selectedPendingIds.length > 0"
                    class="text-xs text-gray-500 hover:text-gray-700"
                    @click="clearSelection"
                  >
                    取消选择 ({{ selectedPendingIds.length }})
                  </button>
                  <button
                    v-if="pendingFiles.length > 0"
                    class="text-xs text-red-500 hover:text-red-700"
                    @click="clearAllPendingFiles"
                  >
                    清空全部
                  </button>
                </div>
              </div>

              <!-- 文件网格内容 -->
              <div ref="fileGridContainerRef" class="flex-1 overflow-auto p-4">
                <SelectionBox
                  ref="selectionBoxRef"
                  v-model="selectedPendingIds"
                  :multiple="true"
                  :double-click-to-clear="true"
                  :realtime-selection="true"
                  :min-selection-size="8"
                  class="h-full"
                  @selection-update="handleSelectionUpdate"
                  @clear-selection="clearSelection"
                >
                  <!-- 空状态 -->
                  <div
                    v-if="pendingFiles.length === 0"
                    class="h-full flex flex-col items-center justify-center text-gray-400 cursor-pointer"
                    @click="triggerFileSelect"
                  >
                    <span class="material-icons text-5xl mb-2">cloud_upload</span>
                    <p>拖拽文件到此处</p>
                    <p class="text-xs mt-1">或点击选择文件（最多 {{ FILE_LIMITS.MAX_FILES_PER_BATCH }} 个）</p>
                  </div>

                  <!-- 文件网格 -->
                  <div
                    v-else
                    class="grid gap-3"
                    :style="{ gridTemplateColumns: `repeat(${columnsPerRow}, 1fr)` }"
                  >
                    <div
                      v-for="file in pendingFiles"
                      :key="file.id"
                      :data-selectable-id="file.id"
                      class="file-card group relative bg-gray-50 rounded-lg overflow-hidden border-2 transition-all cursor-pointer"
                      :class="selectedPendingIds.includes(file.id) ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent hover:border-gray-300'"
                      @click.stop="handleFileClick(file, $event)"
                    >
                      <!-- 预览区域 -->
                      <div class="aspect-square relative">
                        <!-- 图片预览 -->
                        <img
                          v-if="file.preview && isImageFile(file.file.type)"
                          :src="file.preview"
                          class="w-full h-full object-cover"
                          alt="预览"
                        />
                        <!-- 视频预览 -->
                        <div v-else-if="isVideoFile(file.file.type)" class="w-full h-full flex items-center justify-center bg-purple-100">
                          <img
                            v-if="file.preview"
                            :src="file.preview"
                            class="w-full h-full object-cover"
                            alt="视频封面"
                          />
                          <span v-else class="material-icons text-4xl text-purple-400">videocam</span>
                        </div>
                        <!-- 音频预览 -->
                        <div v-else-if="isAudioFile(file.file.type)" class="w-full h-full flex items-center justify-center bg-green-100">
                          <span class="material-icons text-4xl text-green-400">audiotrack</span>
                        </div>
                        <!-- 文档预览 -->
                        <div v-else-if="isDocumentFile(file.file.type)" class="w-full h-full flex items-center justify-center bg-blue-100">
                          <span class="material-icons text-4xl text-blue-400">description</span>
                        </div>
                        <!-- 其他文件 -->
                        <div v-else class="w-full h-full flex items-center justify-center bg-gray-200">
                          <span class="material-icons text-4xl text-gray-400">insert_drive_file</span>
                        </div>

                        <!-- 删除按钮 -->
                        <button
                          class="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          @click.stop="removePendingFile(file.id)"
                        >
                          <span class="material-icons text-sm">close</span>
                        </button>

                        <!-- 上传进度 -->
                        <div
                          v-if="uploadingFileIds.has(file.id)"
                          class="absolute inset-0 bg-black/50 flex items-center justify-center"
                        >
                          <div class="text-center text-white">
                            <div class="text-2xl font-bold">{{ getUploadProgress(file.id) }}%</div>
                            <div class="text-xs">上传中...</div>
                          </div>
                        </div>
                      </div>

                      <!-- 文件信息 -->
                      <div class="p-2">
                        <p class="text-xs font-medium text-gray-700 truncate" :title="file.file.name">
                          {{ file.file.name }}
                        </p>
                        <p class="text-xs text-gray-400">{{ formatFileSize(file.file.size) }}</p>

                        <!-- 元数据标识 -->
                        <div class="flex items-center gap-1 mt-1 flex-wrap">
                          <span
                            v-if="file.folderId"
                            class="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded"
                          >
                            <span class="material-icons text-xs align-middle mr-0.5">folder</span>
                            {{ getFolderName(file.folderId) }}
                          </span>
                          <span
                            v-for="tagId in (file.tags || []).slice(0, 2)"
                            :key="tagId"
                            class="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded"
                          >
                            <span class="material-icons text-xs align-middle mr-0.5">label</span>
                            {{ getTagName(tagId) }}
                          </span>
                          <span
                            v-if="(file.tags?.length || 0) > 2"
                            class="text-xs text-gray-400"
                          >
                            +{{ (file.tags?.length || 0) - 2 }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </SelectionBox>
              </div>
            </div>

          </div>

          <!-- 右侧：文件夹和标签面板 -->
          <div class="w-72 flex flex-col gap-4 flex-shrink-0">
            <!-- 文件夹和标签树 -->
            <div class="bg-white rounded-xl border border-gray-200 overflow-hidden flex-1">
              <div class="p-2 h-full overflow-y-auto space-y-4">
                <FolderTreeComponent
                  item-type="folder"
                  :folders="folderTreeData"
                  :selected-key="selectedTargetFolderId"
                  :show-base-categories="false"
                  @select="handleFolderSelect"
                />
                <FolderTreeComponent
                  item-type="tag"
                  :tags="tagTreeData"
                  @select="handleTagSelect"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <DialogFooter class="flex-row w-full sm:justify-between">
        <div class="flex items-center space-x-2">
          <span class="text-sm text-gray-600">素材库:</span>
          <Select v-model="selectedLibraryId" @update:model-value="(v: any) => handleLibrarySelectChange(v)">
            <SelectTrigger class="w-48">
              <SelectValue placeholder="选择素材库" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="lib in libraryOptions" :key="lib.id" :value="lib.id">{{ lib.name }}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <button
          class="px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="pendingFiles.length === 0 || !selectedLibraryId || uploadingFileIds.size > 0"
          @click="startUpload"
        >
          <span class="flex items-center gap-2">
            <span class="material-icons text-sm">upload</span>
            开始上传 ({{ pendingFiles.length }})
          </span>
        </button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useServerListStore } from '@renderer/stores/serverList'
import { useMediaStore } from '@renderer/stores/media'
import { useLibraryStore } from '@renderer/stores/library'
import { useToast } from '@/renderer/composables/useToast'
import { miraSDKService } from '@renderer/services/MiraSDKService'

// 文件夹和标签类型定义
interface Folder {
  id: number
  title: string
  parent_id?: number
  color?: number
  fileCount?: number
  children?: Folder[]
}

interface Tag {
  id: number
  title: string
  color?: number
  fileCount?: number
}
import Queue from 'queue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import SelectionBox from '@renderer/components/common/SelectionBox.vue'
import FolderTreeComponent from './FolderTreeComponent/FolderTreeComponent.vue'
import type { FolderItem } from '@renderer/types/components'

// 组件属性
interface Props {
  visible?: boolean
  initialFiles?: File[]
  initialFolderId?: string
  initialTagIds?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  visible: false
})

// 组件事件
interface Emits {
  (e: 'update:visible', visible: boolean): void
}

const emit = defineEmits<Emits>()

// 状态管理
const serverListStore = useServerListStore()
const mediaStore = useMediaStore()
const libraryStore = useLibraryStore()
const toast = useToast()

// 响应式数据
const isVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// 待上传文件接口
interface PendingFile {
  id: string
  file: File
  folderId?: string
  tags?: string[]
  preview?: string
}

// 文件引用
const fileInputRef = ref<HTMLInputElement>()
const fileGridContainerRef = ref<HTMLElement>()
const selectionBoxRef = ref()

// 待上传文件列表
const pendingFiles = ref<PendingFile[]>([])
const selectedPendingIds = ref<string[]>([])

// 文件夹和标签数据
const folders = ref<Folder[]>([])
const tags = ref<Tag[]>([])

// 选中的目标文件夹和标签
const selectedTargetFolderId = ref<string>()
const selectedTargetTagIds = ref<string[]>([])

// 上传中的文件ID集合
const uploadingFileIds = ref<Set<string>>(new Set())
const uploadProgressMap = ref<Map<string, number>>(new Map())

// 拖拽状态
const isDragOver = ref(false)

// 素材库选择
const selectedLibraryId = ref<string>('')

// 网格列数
const columnsPerRow = ref(5)

// 文件数量和大小限制配置
const FILE_LIMITS = {
  MAX_FILES_PER_BATCH: 500,
  MAX_CONCURRENT_UPLOADS: 3,
  MAX_TOTAL_SIZE: 1024 * 1024 * 1024,
}

// 上传队列配置
const uploadQueue = new Queue({
  concurrency: FILE_LIMITS.MAX_CONCURRENT_UPLOADS,
  timeout: 60000,
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
})

const updateQueueStats = () => {
  queueStats.value.pending = uploadQueue.length
  queueStats.value.running = uploadingFileIds.value.size
}

// 计算属性
const libraryOptions = computed(() => {
  return libraryStore.libraries.map(lib => ({
    id: lib.id,
    name: lib.name,
    path: lib.path
  }))
})

const currentLibrary = computed(() => {
  return libraryStore.libraries.find(lib => lib.id === selectedLibraryId.value)
})

// 文件夹树数据（转换为 FolderItem 格式）
const folderTreeData = computed<FolderItem[]>(() => {
  const buildTree = (parentId: number | null | undefined): FolderItem[] => {
    return folders.value
      .filter(folder => {
        // 根节点: parent_id 为 null, undefined, 或 0
        if (parentId === null || parentId === undefined) {
          return !folder.parent_id || folder.parent_id === 0
        }
        return folder.parent_id === parentId
      })
      .map(folder => ({
        id: String(folder.id),
        label: folder.title,
        icon: 'folder',
        iconColor: folder.color ? '#' + folder.color.toString(16).padStart(6, '0') : undefined,
        count: folder.fileCount,
        children: buildTree(folder.id),
        originalData: folder
      }))
  }
  return buildTree(null)
})

// 标签树数据（转换为 FolderTreeComponent 需要的格式）
const tagTreeData = computed(() => {
  return tags.value.map(tag => ({
    id: String(tag.id),
    label: tag.title,
    icon: 'label',
    color: tag.color,
    count: tag.fileCount
  }))
})

// 方法
const handleDialogHide = (): void => {
  isVisible.value = false
}

const handleOpenChange = (open: boolean): void => {
  if (!open) {
    handleDialogHide()
  }
}

const handleLibraryChange = async (event: any) => {
  selectedLibraryId.value = event.value
  // 加载文件夹和标签数据
  await loadFoldersAndTags()
}

const handleLibrarySelectChange = async (value: string) => {
  selectedLibraryId.value = value
  // 加载文件夹和标签数据
  await loadFoldersAndTags()
}

const loadFoldersAndTags = async () => {
  if (!selectedLibraryId.value) return

  try {
    // 使用 MiraSDKService 获取文件夹
    const foldersData = await miraSDKService.getAllFolders(selectedLibraryId.value)
    folders.value = foldersData || []
    console.log(`✅ 加载了 ${folders.value.length} 个文件夹`)

    // 使用 SDK client 获取标签
    const client = (miraSDKService as any).client
    if (client) {
      const tagsData = await client.tags().getAll(selectedLibraryId.value)
      tags.value = (tagsData || []).map((tag: any) => ({
        id: tag.id,
        title: tag.title || tag.name,
        color: tag.color,
        fileCount: tag.fileCount || tag.file_count || 0
      }))
      console.log(`✅ 加载了 ${tags.value.length} 个标签`)
    }
  } catch (error) {
    console.error('加载文件夹和标签失败:', error)
    toast.add({
      severity: 'error',
      summary: '加载失败',
      detail: '无法加载文件夹和标签数据',
      life: 3000
    })
  }
}

const triggerFileSelect = () => {
  fileInputRef.value?.click()
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files) {
    addFiles(Array.from(target.files))
  }
  target.value = ''
}

const handleDrop = (event: DragEvent) => {
  isDragOver.value = false
  if (event.dataTransfer?.files) {
    addFiles(Array.from(event.dataTransfer.files))
  }
}

const addFiles = async (files: File[]) => {
  if (files.length + pendingFiles.value.length > FILE_LIMITS.MAX_FILES_PER_BATCH) {
    toast.add({
      severity: 'warn',
      summary: '文件数量过多',
      detail: `单次最多只能上传 ${FILE_LIMITS.MAX_FILES_PER_BATCH} 个文件`,
      life: 5000
    })
    return
  }

  const totalSize = files.reduce((sum, file) => sum + file.size, 0) +
                   pendingFiles.value.reduce((sum, pf) => sum + pf.file.size, 0)
  if (totalSize > FILE_LIMITS.MAX_TOTAL_SIZE) {
    toast.add({
      severity: 'warn',
      summary: '文件总大小过大',
      detail: `文件总大小不能超过 ${formatFileSize(FILE_LIMITS.MAX_TOTAL_SIZE)}`,
      life: 5000
    })
    return
  }

  // 异步生成预览
  const newFiles: PendingFile[] = []
  for (const file of files) {
    newFiles.push({
      id: `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      folderId: selectedTargetFolderId.value,
      tags: selectedTargetTagIds.value ? [...selectedTargetTagIds.value] : undefined,
      preview: undefined // 先占位，稍后异步更新
    })
  }

  // 先添加到列表（显示默认图标）
  pendingFiles.value.push(...newFiles)

  // 异步生成预览
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const pendingFile = newFiles[i]
    try {
      pendingFile.preview = await createPreviewUrl(file)
    } catch (error) {
      console.warn(`生成文件 ${file.name} 预览失败:`, error)
    }
  }
}

const createPreviewUrl = async (file: File): Promise<string | undefined> => {
  if (file.type.startsWith('image/')) {
    return URL.createObjectURL(file)
  }

  if (file.type.startsWith('video/')) {
    // 动态导入视频缩略图函数（避免循环依赖）
    const { createVideoThumbnail } = await import('@renderer/utils/fileUtils')
    return createVideoThumbnail(file, undefined, 320)
  }

  return undefined
}

const removePendingFile = (id: string) => {
  const index = pendingFiles.value.findIndex(f => f.id === id)
  if (index !== -1) {
    const file = pendingFiles.value[index]
    if (file.preview) {
      URL.revokeObjectURL(file.preview)
    }
    pendingFiles.value.splice(index, 1)
    selectedPendingIds.value = selectedPendingIds.value.filter(fid => fid !== id)
  }
}

const clearAllPendingFiles = () => {
  pendingFiles.value.forEach(file => {
    if (file.preview) {
      URL.revokeObjectURL(file.preview)
    }
  })
  pendingFiles.value = []
  selectedPendingIds.value = []
}

const clearSelection = () => {
  selectedPendingIds.value = []
  // 清空右侧的选中状态
  selectedTargetFolderId.value = undefined
  selectedTargetTagIds.value = []
}

const handleFileClick = (file: PendingFile, event: MouseEvent) => {
  if (selectionBoxRef.value) {
    selectionBoxRef.value.handleItemClick(file.id, event)
  }
}

const handleSelectionUpdate = (ids: string[]) => {
  // v-model 会自动更新 selectedPendingIds，这里只需要处理额外逻辑
  updateRightPanelFromSelection(ids)
}

// 根据选中文件更新右侧面板显示
const updateRightPanelFromSelection = (ids: string[]) => {
  // 如果没有选中项，清空右侧选中状态
  if (ids.length === 0) {
    selectedTargetFolderId.value = undefined
    selectedTargetTagIds.value = []
    return
  }

  // 如果选中了文件，更新右侧显示为选中文件中第一个文件的元数据
  const firstFile = pendingFiles.value.find(f => f.id === ids[0])
  if (firstFile) {
    selectedTargetFolderId.value = firstFile.folderId
    selectedTargetTagIds.value = firstFile.tags ? [...firstFile.tags] : []
  }
}

// 监听选中文件变化，更新右侧面板
watch(
  () => [...selectedPendingIds.value],
  (newIds) => {
    console.log('选中文件变化:', newIds)
    updateRightPanelFromSelection(newIds)
  }
)

const handleFolderSelect = (folder: FolderItem) => {
  selectedTargetFolderId.value = folder.id as string

  // 如果有选中的文件，直接应用
  if (selectedPendingIds.value.length > 0) {
    applyMetadataToSelected()
  }
}

const handleTagSelect = (tag: any) => {
  const tagId = String(tag.id)

  // 切换标签选中状态（创建新数组以确保响应式更新）
  const index = selectedTargetTagIds.value.indexOf(tagId)
  if (index === -1) {
    selectedTargetTagIds.value = [...selectedTargetTagIds.value, tagId]
  } else {
    selectedTargetTagIds.value = selectedTargetTagIds.value.filter(id => id !== tagId)
  }

  // 如果有选中的文件，直接应用
  if (selectedPendingIds.value.length > 0) {
    applyMetadataToSelected()
  }
}

const applyMetadataToSelected = () => {
  selectedPendingIds.value.forEach(id => {
    const file = pendingFiles.value.find(f => f.id === id)
    if (file) {
      if (selectedTargetFolderId.value) {
        file.folderId = selectedTargetFolderId.value
      }
      if (selectedTargetTagIds.value.length > 0) {
        // 合并标签，去重
        const existingTags = file.tags || []
        file.tags = [...new Set([...existingTags, ...selectedTargetTagIds.value])]
      }
    }
  })

  toast.add({
    severity: 'success',
    summary: '已应用',
    detail: `已为 ${selectedPendingIds.value.length} 个文件设置元数据`,
    life: 2000
  })
}

const startUpload = async () => {
  if (!currentLibrary.value) {
    toast.add({
      severity: 'error',
      summary: '错误',
      detail: '请先选择一个素材库',
      life: 3000
    })
    return
  }

  if (pendingFiles.value.length === 0) {
    toast.add({
      severity: 'warn',
      summary: '提示',
      detail: '没有待上传的文件',
      life: 3000
    })
    return
  }

  // 将文件添加到上传队列
  const filesToUpload = [...pendingFiles.value]

  filesToUpload.forEach(pendingFile => {
    uploadingFileIds.value.add(pendingFile.id)
    uploadProgressMap.value.set(pendingFile.id, 0)

    const uploadJob = createUploadJob(pendingFile)
    uploadQueue.push(uploadJob)
  })
}

const createUploadJob = (pendingFile: PendingFile) => {
  return (callback?: (error?: Error, result?: any) => void) => {
    if (!currentLibrary.value) {
      const error = new Error('请先选择素材库')
      callback?.(error)
      return
    }

    // 构建 metadata 对象
    const metadata: Record<string, any> = {}

    if (pendingFile.folderId) {
      metadata.folderId = pendingFile.folderId
    }

    if (pendingFile.tags && pendingFile.tags.length > 0) {
      metadata.tags = pendingFile.tags
    }

    // 模拟进度更新
    const progressInterval = setInterval(() => {
      const currentProgress = uploadProgressMap.value.get(pendingFile.id) || 0
      const newProgress = Math.min(currentProgress + Math.random() * 20, 90)
      uploadProgressMap.value.set(pendingFile.id, newProgress)
    }, 200)

    // 调用上传 API
    mediaStore.uploadFile(pendingFile.file, currentLibrary.value.id, Object.keys(metadata).length > 0 ? metadata : undefined)
      .then(result => {
        clearInterval(progressInterval)
        uploadProgressMap.value.set(pendingFile.id, 100)

        if (result.success) {
          // 上传成功，从待上传列表移除
          removePendingFile(pendingFile.id)
          uploadingFileIds.value.delete(pendingFile.id)
          callback?.(undefined, result)
        } else {
          throw new Error(result.error || '上传失败')
        }
      })
      .catch(error => {
        clearInterval(progressInterval)
        uploadingFileIds.value.delete(pendingFile.id)
        console.error('Upload error:', error)
        callback?.(error)

        toast.add({
          severity: 'error',
          summary: '上传失败',
          detail: `文件 ${pendingFile.file.name}: ${error.message}`,
          life: 5000
        })
      })
  }
}

const getUploadProgress = (id: string): number => {
  return Math.round(uploadProgressMap.value.get(id) || 0)
}

const getFolderName = (id: string): string => {
  const folder = folders.value.find(f => String(f.id) === id)
  return folder?.title || '未知文件夹'
}

const getTagName = (id: string): string => {
  const tag = tags.value.find(t => String(t.id) === id)
  return tag?.title || '未知标签'
}

// 文件类型判断
const isImageFile = (mimeType: string): boolean => mimeType.startsWith('image/')
const isVideoFile = (mimeType: string): boolean => mimeType.startsWith('video/')
const isAudioFile = (mimeType: string): boolean => mimeType.startsWith('audio/')
const isDocumentFile = (mimeType: string): boolean => {
  return mimeType.includes('pdf') ||
         mimeType.includes('document') ||
         mimeType.includes('text') ||
         mimeType.includes('spreadsheet') ||
         mimeType.includes('presentation')
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 按需初始化标志
const isInitialized = ref(false)

// 监听对话框打开，按需初始化
watch(isVisible, async (visible) => {
  if (visible) {
    if (!isInitialized.value) {
      await nextTick()
      try {
        await serverListStore.initializeServerList()
        await libraryStore.fetchLibraries()

        if (libraryStore.libraries.length > 0) {
          selectedLibraryId.value = libraryStore.libraries[0].id
          await loadFoldersAndTags()
        }

        isInitialized.value = true
      } catch (error) {
        console.error('初始化文件上传对话框失败:', error)
      }
    }

    // 处理传入的初始数据：先设文件夹/标签，再添加文件（addFiles 会读取当前选中值）
    if (props.initialFolderId) {
      selectedTargetFolderId.value = props.initialFolderId
    }
    if (props.initialTagIds && props.initialTagIds.length > 0) {
      selectedTargetTagIds.value = [...props.initialTagIds]
    }
    if (props.initialFiles && props.initialFiles.length > 0) {
      await addFiles(props.initialFiles)
    }
  }
})

// 监听素材库变化，重新加载文件夹和标签
watch(selectedLibraryId, async (newId) => {
  if (newId && isInitialized.value) {
    await loadFoldersAndTags()
  }
})
</script>

<style scoped>
.file-upload-content {
  min-height: 400px;
}

.upload-dropzone {
  user-select: none;
}

.file-card {
  user-select: none;
}

.tag-btn {
  white-space: nowrap;
}

/* SelectionBox 样式 */
:deep(.selection-box) {
  background: rgba(59, 130, 246, 0.1);
  border: 2px solid rgba(59, 130, 246, 0.6);
  border-radius: 4px;
}
</style>
