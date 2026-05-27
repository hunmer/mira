<template>
  <Dialog
    :open="isVisible"
    @update:open="handleOpenChange"
  >
    <DialogContent class="file-upload-dialog sm:max-w-[90vw] h-[85vh] grid grid-rows-[auto_1fr_auto] overflow-hidden top-[5vh] translate-y-0">
      <DialogHeader>
        <DialogTitle>文件上传</DialogTitle>
      </DialogHeader>
      <div class="file-upload-content flex flex-col min-h-0 overflow-hidden">
        <!-- 顶部队列状态 -->
        <div v-if="queueStats.pending > 0 || queueStats.running > 0" class="flex items-center justify-end space-x-4 text-sm mb-4 px-1">
          <span class="text-blue-600 dark:text-blue-400">等待中: {{ queueStats.pending }}</span>
          <span class="text-orange-600 dark:text-orange-400">上传中: {{ queueStats.running }}</span>
          <span class="text-green-600 dark:text-green-400">已完成: {{ queueStats.completed }}</span>
          <span v-if="queueStats.failed > 0" class="text-red-600 dark:text-red-400">失败: {{ queueStats.failed }}</span>
        </div>

        <!-- 主体内容区域 -->
        <div class="flex-1 flex gap-4 min-h-0 overflow-hidden">
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
              class="flex-1 bg-white dark:bg-gray-900 rounded-xl border-2 overflow-hidden flex flex-col transition-colors"
              :class="isDragOver ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'"
              @drop.prevent="handleDrop"
              @dragover.prevent="isDragOver = true"
              @dragleave.prevent="isDragOver = false"
            >
              <!-- 文件列表头部 -->
              <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <div class="flex items-center space-x-2">
                  <span class="text-sm font-medium text-gray-700 dark:text-gray-300">待上传文件</span>
                  <span v-if="pendingFiles.length > 0" class="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                    {{ pendingFiles.length }} 个
                  </span>
                </div>
                <div class="flex items-center space-x-2">
                  <button
                    v-if="selectedPendingIds.length > 0"
                    class="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    @click="clearSelection"
                  >
                    取消选择 ({{ selectedPendingIds.length }})
                  </button>
                  <button
                    v-if="pendingFiles.length > 0"
                    class="text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                    @click="clearAllPendingFiles"
                  >
                    清空全部
                  </button>
                </div>
              </div>

              <!-- 文件网格内容 -->
              <div ref="fileGridContainerRef" class="flex-1 min-h-0">
                <SelectionBox
                  ref="selectionBoxRef"
                  v-model="selectedPendingIds"
                  :multiple="true"
                  :double-click-to-clear="true"
                  :realtime-selection="true"
                  :min-selection-size="8"
                  class="h-full overflow-auto p-4"
                  @selection-update="handleSelectionUpdate"
                  @clear-selection="clearSelection"
                >
                  <!-- 空状态 -->
                  <div
                    v-if="pendingFiles.length === 0"
                    class="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 cursor-pointer"
                    @click="triggerFileSelect(fileInputRef)"
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
                      class="file-card group relative bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden border-2 transition-all cursor-pointer"
                      :class="selectedPendingIds.includes(file.id) ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800' : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'"
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
                        <div v-else-if="isVideoFile(file.file.type)" class="w-full h-full flex items-center justify-center bg-purple-100 dark:bg-purple-900/30">
                          <img
                            v-if="file.preview"
                            :src="file.preview"
                            class="w-full h-full object-cover"
                            alt="视频封面"
                          />
                          <span v-else class="material-icons text-4xl text-purple-400">videocam</span>
                        </div>
                        <!-- 音频预览 -->
                        <div v-else-if="isAudioFile(file.file.type)" class="w-full h-full flex items-center justify-center bg-green-100 dark:bg-green-900/30">
                          <span class="material-icons text-4xl text-green-400">audiotrack</span>
                        </div>
                        <!-- 文档预览 -->
                        <div v-else-if="isDocumentFile(file.file.type)" class="w-full h-full flex items-center justify-center bg-blue-100 dark:bg-blue-900/30">
                          <span class="material-icons text-4xl text-blue-400">description</span>
                        </div>
                        <!-- 其他文件 -->
                        <div v-else class="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
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
                        <p class="text-xs font-medium text-gray-700 dark:text-gray-300 truncate" :title="file.file.name">
                          {{ file.file.name }}
                        </p>
                        <p class="text-xs text-gray-400">{{ formatFileSize(file.file.size) }}</p>

                        <!-- 元数据标识 -->
                        <div class="flex items-center gap-1 mt-1 flex-wrap">
                          <span
                            v-if="file.folderId"
                            class="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded"
                          >
                            <span class="material-icons text-xs align-middle mr-0.5">folder</span>
                            {{ getFolderName(file.folderId) }}
                          </span>
                          <span
                            v-for="tagId in (file.tags || []).slice(0, 2)"
                            :key="tagId"
                            class="text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded"
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
            <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex-1">
              <div class="p-2 h-full overflow-y-auto space-y-4">
                <FolderTreeComponent
                  item-type="folder"
                  :folders="folderTreeData"
                  :selected-key="selectedTargetFolderId"
                  :show-base-categories="false"
                  :default-show-search="true"
                  @select="handleFolderTreeSelect"
                />
                <FolderTreeComponent
                  item-type="tag"
                  :tags="tagTreeData"
                  :default-show-search="true"
                  @select="handleTagTreeSelect"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <DialogFooter class="flex-row w-full sm:justify-between">
        <div class="flex items-center space-x-2">
          <span class="text-sm text-gray-600 dark:text-gray-400">素材库:</span>
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
          class="px-6 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
import { ref } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import SelectionBox from '@renderer/components/common/SelectionBox.vue'
import FolderTreeComponent from './FolderTreeComponent/FolderTreeComponent.vue'
import { useFileUploadDialog } from './FileUploadDialog/useFileUploadDialog'
import { isImageFile, isVideoFile, isAudioFile, isDocumentFile, formatFileSize } from './FileUploadDialog/useFileManagement'
import { FILE_LIMITS } from './FileUploadDialog/types'
import type { Props, Emits } from './FileUploadDialog/types'

const props = withDefaults(defineProps<Props>(), {
  visible: false
})
const emit = defineEmits<Emits>()

const {
  isVisible,
  selectedLibraryId,
  libraryOptions,
  fileManagement,
  uploadQueue,
  folderTagPanel,
  handleOpenChange,
  handleLibrarySelectChange,
  triggerFileSelect,
  handleFileSelect,
  handleDrop,
  clearSelection,
  startUpload
} = useFileUploadDialog(props, emit)

// 解构给模板直接使用
const { pendingFiles, selectedPendingIds, isDragOver, columnsPerRow, removePendingFile, clearAllPendingFiles } = fileManagement
const { uploadingFileIds, queueStats, getUploadProgress } = uploadQueue
const { selectedTargetFolderId, folderTreeData, tagTreeData, getFolderName, getTagName, handleFolderSelect, handleTagSelect, applyMetadataToFiles } = folderTagPanel

// 模板引用
const fileInputRef = ref<HTMLInputElement>()
const selectionBoxRef = ref()

function handleFileClick(file: any, event: MouseEvent) {
  selectionBoxRef.value?.handleItemClick(file.id, event)
}

function handleSelectionUpdate(_ids: string[]) {
  // v-model 自动更新 selectedPendingIds
}

function handleFolderTreeSelect(folder: any) {
  const deselected = handleFolderSelect(folder)
  if (deselected) {
    const ids = selectedPendingIds.value.length > 0 ? selectedPendingIds.value : pendingFiles.value.map(f => f.id)
    ids.forEach(id => {
      const file = pendingFiles.value.find(f => f.id === id)
      if (file) delete file.folderId
    })
  } else {
    applyMetadataToFiles(pendingFiles, selectedPendingIds.value)
  }
}

function handleTagTreeSelect(tag: any) {
  const removedTagId = handleTagSelect(tag)
  if (removedTagId) {
    const ids = selectedPendingIds.value.length > 0 ? selectedPendingIds.value : pendingFiles.value.map(f => f.id)
    ids.forEach(id => {
      const file = pendingFiles.value.find(f => f.id === id)
      if (file?.tags) file.tags = file.tags.filter(t => t !== removedTagId)
    })
  } else {
    applyMetadataToFiles(pendingFiles, selectedPendingIds.value)
  }
}
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
