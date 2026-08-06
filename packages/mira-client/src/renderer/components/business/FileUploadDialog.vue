<template>
  <Dialog
    :open="isVisible"
    @update:open="handleOpenChange"
  >
    <DialogContent class="file-upload-dialog sm:max-w-[90vw] h-[85vh] grid grid-rows-[auto_1fr_auto] overflow-hidden">
      <DialogHeader>
        <DialogTitle>文件上传</DialogTitle>
      </DialogHeader>
      <div class="file-upload-content flex flex-col min-h-[400px] overflow-hidden">
        <!-- 顶部队列状态 -->
        <div v-if="queueStats.pending > 0 || queueStats.running > 0" class="flex items-center justify-end space-x-4 text-sm mb-4 px-1">
          <span class="text-primary dark:text-primary">等待中: {{ queueStats.pending }}</span>
          <span class="text-orange-600 dark:text-orange-400">上传中: {{ queueStats.running }}</span>
          <span class="text-green-600 dark:text-green-400">已完成: {{ queueStats.completed }}</span>
          <span v-if="queueStats.failed > 0" class="text-destructive dark:text-destructive">失败: {{ queueStats.failed }}</span>
        </div>

        <!-- 主体内容区域 -->
        <div class="flex-1 flex gap-4 min-h-0 overflow-hidden">
          <!-- 最左侧：本地文件夹树（导入的目录结构，仅浏览/筛选） -->
          <div class="w-60 flex flex-col flex-shrink-0">
            <div class="flex-1 min-h-0">
              <div class="p-2 h-full overflow-y-auto">
                <FolderTreeComponent
                  item-type="folder"
                  :folders="localTreeData"
                  :selected-key="selectedLocalDir"
                  :show-base-categories="true"
                  :base-categories-config="baseCategoriesConfig"
                  @select="handleLocalTreeSelect"
                />
              </div>
            </div>
            <!-- 按原有结构导入：在服务器镜像创建本地目录层级并应用到文件 -->
            <button
              class="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary dark:bg-primary text-white text-xs font-medium hover:bg-primary dark:hover:bg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="isImportingStructure || localTreeData.length === 0"
              :title="localTreeData.length === 0 ? '请先导入文件夹' : '按本地目录层级在素材库下创建对应文件夹并应用到待上传文件'"
              @click="importWithStructure"
            >
              <span>{{ isImportingStructure ? '导入中...' : '按原有结构创建文件夹' }}</span>
            </button>
          </div>

          <!-- 中间：上传区域和文件网格 -->
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
              class="flex-1 rounded-xl border-2 overflow-hidden flex flex-col transition-colors"
              :class="isDragOver ? 'border-primary bg-primary/30 dark:bg-primary/20' : 'border-white/60 dark:border-border'"
              @drop.prevent="handleDrop"
              @dragover.prevent="isDragOver = true"
              @dragleave.prevent="isDragOver = false"
            >
              <!-- 文件列表头部 -->
              <div class="flex items-center justify-between px-4 py-3 border-b border-border dark:border-border">
                <div class="flex items-center space-x-2">
                  <span class="text-sm font-medium text-foreground dark:text-muted-foreground">待上传文件</span>
                  <span v-if="pendingFiles.length > 0" class="text-xs text-muted-foreground dark:text-muted-foreground bg-muted dark:bg-muted px-2 py-0.5 rounded-full">
                    {{ filteredPendingFiles.length }} / {{ pendingFiles.length }} 个
                  </span>
                </div>
                <div class="flex items-center space-x-2">
                  <button
                    v-if="selectedPendingIds.length > 0"
                    class="text-xs text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-muted-foreground"
                    @click="clearSelection"
                  >
                    取消选择 ({{ selectedPendingIds.length }})
                  </button>
                  <button
                    v-if="pendingFiles.length > 0"
                    class="text-xs text-destructive dark:text-destructive hover:text-destructive dark:hover:text-destructive"
                    @click="handleClearAll"
                  >
                    清空全部
                  </button>
                </div>
              </div>

              <!-- 过滤器：格式 / 文件大小 / 文件名 + 切换隐藏不符合条件 -->
              <div v-if="pendingFiles.length > 0" class="flex items-center gap-2 px-4 py-2 border-b border-border dark:border-border flex-wrap">
                <!-- 格式 -->
                <Select v-model="formatFilter">
                  <SelectTrigger class="h-7 w-24 text-xs">
                    <SelectValue placeholder="格式" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部格式</SelectItem>
                    <SelectItem value="image">图片</SelectItem>
                    <SelectItem value="video">视频</SelectItem>
                    <SelectItem value="audio">音频</SelectItem>
                    <SelectItem value="document">文档</SelectItem>
                    <SelectItem value="other">其他</SelectItem>
                  </SelectContent>
                </Select>
                <!-- 文件大小 -->
                <Select v-if="sizeFilter !== 'custom'" v-model="sizeFilter" @update:model-value="onSizeFilterChange">
                  <SelectTrigger class="h-7 w-28 text-xs">
                    <SelectValue placeholder="文件大小" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部大小</SelectItem>
                    <SelectItem value="lt1m">&lt; 1MB</SelectItem>
                    <SelectItem value="1to10m">1 - 10MB</SelectItem>
                    <SelectItem value="gt10m">&gt; 10MB</SelectItem>
                    <SelectItem value="custom">自定义...</SelectItem>
                  </SelectContent>
                </Select>
                <!-- 文件大小：自定义区间（双滑块） -->
                <Popover v-else v-model:open="sizePopoverOpen">
                  <PopoverTrigger as-child>
                    <button
                      class="h-7 w-28 text-xs flex items-center justify-between px-2 rounded-md border border-primary text-primary dark:text-primary bg-primary/40 dark:bg-primary/20 hover:bg-primary dark:hover:bg-primary/30"
                    >
                      <span class="truncate">{{ sizeRangeDisplay[0] }} - {{ sizeRangeDisplay[1] }} {{ unitLabel }}</span>
                      <span
                        class="material-icons ml-1 text-muted-foreground hover:text-destructive"
                        style="font-size: 14px"
                        @click.stop="sizePopoverOpen = false; sizeFilter = 'all'"
                        title="清除自定义"
                      >close</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent class="w-64 p-3" align="start">
                    <div class="space-y-3">
                      <!-- 单位切换 -->
                      <div class="flex items-center gap-1">
                        <button
                          v-for="u in sizeUnits"
                          :key="u.value"
                          class="flex-1 h-6 text-xs rounded border transition-colors"
                          :class="sizeUnit === u.value
                            ? 'border-primary text-primary dark:text-primary bg-primary/50 dark:bg-primary/30'
                            : 'border-border dark:border-border text-muted-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-muted'"
                          @click="changeSizeUnit(u.value)"
                        >{{ u.label }}</button>
                      </div>
                      <div class="flex items-center justify-between text-xs text-muted-foreground dark:text-muted-foreground">
                        <span>最小 {{ sizeRangeDisplay[0] }} {{ unitLabel }}</span>
                        <span>最大 {{ sizeRangeDisplay[1] }} {{ unitLabel }}</span>
                      </div>
                      <Slider
                        v-model="sizeRangeDisplay"
                        :min="0"
                        :max="sliderMax"
                        :step="sliderStep"
                        type="multiple"
                      />
                      <div class="flex items-center justify-between gap-2">
                        <div class="flex items-center gap-1">
                          <input
                            v-model.number="sizeRangeDisplayMin"
                            type="number"
                            min="0"
                            class="h-7 w-16 text-xs px-2 rounded-md border border-border dark:border-border bg-transparent"
                          />
                          <span class="text-xs text-muted-foreground">{{ unitLabel }}</span>
                        </div>
                        <span class="text-muted-foreground">~</span>
                        <div class="flex items-center gap-1">
                          <input
                            v-model.number="sizeRangeDisplayMax"
                            type="number"
                            min="0"
                            class="h-7 w-16 text-xs px-2 rounded-md border border-border dark:border-border bg-transparent"
                          />
                          <span class="text-xs text-muted-foreground">{{ unitLabel }}</span>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <!-- 文件名 -->
                <div class="relative flex-1 min-w-[120px]">
                  <span class="material-icons absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" style="font-size: 14px">search</span>
                  <input
                    v-model="nameFilter"
                    type="text"
                    placeholder="文件名"
                    class="h-7 w-full pl-7 pr-2 text-xs rounded-md border border-border dark:border-border bg-transparent focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <!-- 命中数提示 -->
                <span v-if="hasActiveFilter" class="text-xs text-muted-foreground whitespace-nowrap">
                  命中 {{ matchedCount }}
                </span>
                <!-- 切换隐藏不符合条件 -->
                <button
                  class="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-muted-foreground dark:hover:text-muted-foreground hover:bg-muted dark:hover:bg-muted transition-colors"
                  :class="{ 'text-primary dark:text-primary': hideNonMatching }"
                  :title="hideNonMatching ? '显示不符合条件的文件' : '隐藏不符合条件的文件'"
                  @click="hideNonMatching = !hideNonMatching"
                >
                  <span class="material-icons leading-none" style="font-size: 18px">
                    {{ hideNonMatching ? 'visibility_off' : 'visibility' }}
                  </span>
                </button>
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
                    v-if="displayFiles.length === 0"
                    class="h-full flex flex-col items-center justify-center text-muted-foreground dark:text-muted-foreground cursor-pointer"
                    @click="triggerFileSelect(fileInputRef)"
                  >
                    <span class="material-icons text-5xl mb-2">cloud_upload</span>
                    <p>拖拽文件到此处</p>
                    <p class="text-xs mt-1">或点击选择文件（最多 {{ FILE_LIMITS.MAX_FILES_PER_BATCH }} 个）</p>
                  </div>

                  <!-- 文件网格：Masonry 按容器宽度响应式分列 -->
                  <Masonry
                    v-else
                    ref="masonryRef"
                    :data="displayFiles"
                    :get-key="(file: any) => file.id"
                    :columns="columnsByWidth"
                    :gap="12"
                    :get-meta="getFileMeta"
                    :layout-mode="'fill'"
                    :enter-animation="true"
                    :exit-animation="true"
                    :layout-transition="true"
                    :lazy-root-margin="'300px'"
                  >
                    <template #default="{ item: file }">
                      <div
                        :data-selectable-id="matchesFilters(file) ? file.id : undefined"
                        class="file-card group relative flex flex-col bg-white/40 dark:bg-muted/40 backdrop-blur-sm rounded-lg overflow-hidden border-2 transition-all select-none h-full"
                        :class="[
                          !matchesFilters(file) ? 'opacity-50 cursor-not-allowed border-transparent' : (selectedPendingIds.includes(file.id) ? 'border-primary ring-2 ring-primary dark:ring-primary cursor-pointer' : 'border-transparent hover:border-border dark:hover:border-border cursor-pointer')
                        ]"
                        @click.stop="matchesFilters(file) && handleFileClick(file, $event)"
                      >
                        <!-- 预览区域：按真实比例自适应填充 Masonry 分配的剩余高度 -->
                        <div class="flex-1 min-h-0 relative">
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
                          <div v-else-if="isDocumentFile(file.file.type)" class="w-full h-full flex items-center justify-center bg-primary dark:bg-primary/30">
                            <span class="material-icons text-4xl text-primary">description</span>
                          </div>
                          <!-- 其他文件 -->
                          <div v-else class="w-full h-full flex items-center justify-center bg-accent dark:bg-muted">
                            <span class="material-icons text-4xl text-muted-foreground">insert_drive_file</span>
                          </div>

                          <!-- 删除按钮 -->
                          <button
                            class="absolute top-1 right-1 w-6 h-6 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
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

                          <!-- 不符合条件遮罩 -->
                          <div
                            v-if="!matchesFilters(file)"
                            class="absolute inset-0 bg-muted/30 flex items-center justify-center pointer-events-none"
                          >
                            <span class="text-xs text-white bg-muted/80 px-2 py-0.5 rounded">不符合条件</span>
                          </div>
                        </div>

                        <!-- 文件信息：固定高度不收缩，与 CARD_INFO_HEIGHT 估值对齐 -->
                        <div class="p-2 shrink-0">
                          <p class="text-xs font-medium text-foreground dark:text-muted-foreground truncate" :title="file.file.name">
                            {{ file.file.name }}
                          </p>
                          <p class="text-xs text-muted-foreground">{{ formatFileSize(file.localSize ?? file.file.size) }}</p>

                          <!-- 元数据标识 -->
                          <div class="flex items-center gap-1 mt-1 flex-wrap">
                            <span
                              v-if="file.folderId"
                              class="text-xs bg-primary dark:bg-primary/30 text-primary dark:text-primary px-1.5 py-0.5 rounded"
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
                              class="text-xs text-muted-foreground"
                            >
                              +{{ (file.tags?.length || 0) - 2 }}
                            </span>
                          </div>
                        </div>
                      </div>
                    </template>
                  </Masonry>
                </SelectionBox>
              </div>
            </div>

          </div>

          <!-- 右侧：文件夹和标签面板 -->
          <div class="w-72 flex flex-col gap-4 flex-shrink-0">
            <!-- 文件夹和标签树 -->
            <div class="overflow-hidden flex-1">
              <div class="p-2 h-full overflow-y-auto space-y-4">
                <FolderTreeComponent
                  item-type="folder"
                  :folders="folderTreeData"
                  :selected-key="selectedTargetFolderId"
                  :show-base-categories="false"
                  :default-show-search="true"
                  @select="handleFolderTreeSelect"
                  @refresh="handleFolderPanelRefresh"
                />
                <FolderTreeComponent
                  item-type="tag"
                  :tags="tagTreeData"
                  :default-show-search="true"
                  @select="handleTagTreeSelect"
                  @refresh="handleFolderPanelRefresh"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <DialogFooter class="flex-row w-full sm:justify-between">
        <div class="flex items-center space-x-2">
          <span class="text-sm text-muted-foreground dark:text-muted-foreground">素材库:</span>
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
          class="px-6 py-2 bg-primary dark:bg-primary text-white rounded-lg font-medium hover:bg-primary dark:hover:bg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
import { ref, computed, nextTick, watch } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Slider } from '@/components/ui/slider'
import SelectionBox from '@renderer/components/common/SelectionBox.vue'
import { Masonry, type MasonryColumns, type MasonryItemMeta } from '@hunmer/vue-masonry'
import FolderTreeComponent from './FolderTreeComponent/FolderTreeComponent.vue'
import { useFileUploadDialog } from './FileUploadDialog/useFileUploadDialog'
import { isImageFile, isVideoFile, isAudioFile, isDocumentFile, formatFileSize } from './FileUploadDialog/useFileManagement'
import { useFileRatios } from './FileUploadDialog/useFileRatios'
import { FILE_LIMITS } from './FileUploadDialog/types'
import type { Props, Emits, PendingFile } from './FileUploadDialog/types'

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
  localTree,
  fileFilters,
  handleOpenChange,
  handleLibrarySelectChange,
  triggerFileSelect,
  handleFileSelect,
  handleDrop,
  clearSelection,
  importWithStructure,
  isImportingStructure,
  startUpload
} = useFileUploadDialog(props, emit)

// 文件过滤器
const {
  formatFilter,
  sizeFilter,
  sizeRangeDisplay,
  sizeUnit,
  changeSizeUnit,
  nameFilter,
  matchesFilters,
  hasActiveFilter
} = fileFilters
// 切换隐藏不符合条件的文件
const hideNonMatching = ref(false)
// 自定义大小区间 Popover 的打开状态
const sizePopoverOpen = ref(false)

// 大小单位选项与标签
const sizeUnits = [
  { value: 'kb' as const, label: 'KB' },
  { value: 'mb' as const, label: 'MB' },
  { value: 'gb' as const, label: 'GB' },
]
const unitLabel = computed(() => sizeUnits.find((u) => u.value === sizeUnit.value)?.label || '')

// 滑块最大值/步长随单位变化（保证可拖动范围合理）
const sliderMax = computed(() => (sizeUnit.value === 'kb' ? 1024 : sizeUnit.value === 'mb' ? 1024 : 100))
const sliderStep = 1

// 两个数字输入框分别绑定展示区间的 min / max（写入经 sizeRangeDisplay 回到字节）
const sizeRangeDisplayMin = computed<number>({
  get: () => sizeRangeDisplay.value[0],
  set: (val) => {
    sizeRangeDisplay.value = [val, sizeRangeDisplay.value[1]]
  },
})
const sizeRangeDisplayMax = computed<number>({
  get: () => sizeRangeDisplay.value[1],
  set: (val) => {
    sizeRangeDisplay.value = [sizeRangeDisplay.value[0], val]
  },
})

// 选择【自定义】时，下一个 tick 再打开 Popover，避免同一点击事件被 Popover 误判为外部点击而立即关闭
function onSizeFilterChange(value: any) {
  if (value === 'custom') {
    nextTick(() => {
      sizePopoverOpen.value = true
    })
  }
}

// 解构给模板直接使用
const { pendingFiles, selectedPendingIds, isDragOver, removePendingFile, clearAllPendingFiles } = fileManagement
const { uploadingFileIds, queueStats, getUploadProgress } = uploadQueue
const { selectedTargetFolderId, folderTreeData, tagTreeData, getFolderName, getTagName, handleFolderSelect, handleTagSelect, applyMetadataToFiles, loadFoldersAndTags } = folderTagPanel
// 本地树（左栏）：仅浏览/筛选，不参与上传 metadata
const {
  baseCategoriesConfig,
  localTreeData,
  selectedLocalDir,
  filteredPendingFiles,
  handleLocalTreeSelect,
  clearLocalTree
} = localTree

/**
 * 最终展示的文件列表：
 * 先按左栏本地目录筛选，再根据【隐藏不符合条件】决定是否过滤掉不符合过滤条件的文件。
 * 未隐藏时：不符合条件的文件仍展示（不可选中 + 显示【不符合条件】）。
 */
const displayFiles = computed(() => {
  if (!hideNonMatching.value) return filteredPendingFiles.value
  return filteredPendingFiles.value.filter((f) => matchesFilters(f))
})

// 当前匹配过滤条件的文件数（用于计数提示）
const matchedCount = computed(
  () => filteredPendingFiles.value.filter((f) => matchesFilters(f)).length
)

// 模板引用
const fileInputRef = ref<HTMLInputElement>()
const selectionBoxRef = ref()
const fileGridContainerRef = ref<HTMLElement>()

/**
 * 待上传网格响应式分列：基于 Tailwind 断点随容器宽度增减列数。
 * 列数比固定正方形时期稍密（瀑布流按真实比例变高，列窄一点视觉更紧凑）。
 * Masonry 内部用 ResizeObserver 实时测容器宽，这里只给断点映射。
 */
const columnsByWidth = computed<MasonryColumns>(() => ({
  base: 2,   // < 640px
  sm: 3,     // >= 640px
  md: 5,     // >= 768px
  lg: 7,     // >= 1024px
  xl: 9      // >= 1280px
}))

// 列数上限近似值，用于约束 colSpan（保证宽图旁还能放普通项）
const approxColumns = computed(() => {
  const cols = columnsByWidth.value
  return typeof cols === 'object' ? (cols.xl ?? 9) : cols
})

// 复用 WaterfallComponent 的真实比例预加载能力（等 preview 就绪后读取 naturalWidth/Height）
const { ratios, getRatio } = useFileRatios(pendingFiles, approxColumns.value)

// 卡片信息块（文件名/大小/标签）固定高度估值，叠加到预览高度上
const CARD_INFO_HEIGHT = 76
// 宽图占列阈值（基于 ratio = w/h）：>= 阈值占更多列，与 WaterfallComponent 对齐
const WIDE_RATIO_THRESHOLD = 1.6
const ULTRA_WIDE_RATIO_THRESHOLD = 2.4

/**
 * 真实变高瀑布流的布局元信息。
 *
 * 高度计算要点：Masonry 的 aspect 是针对「整个 item 宽度」算总高度。
 * 卡片 = 预览区(按真实图片比例) + 固定信息块(CARD_INFO_HEIGHT)。
 * 因此合成 aspect 时要让「预览区高度 = colWidth × 真实比例」，再补上信息块高度，
 * 即 aspect 表示的 height = 预览区高度 + 信息块高度。
 *
 * 实现：换算成等价的 width:height 比例。以 colWidth 为参照宽度，预览区高 = colWidth/ratio，
 * 信息块加 CARD_INFO_HEIGHT，得到合成 aspect = colWidth : (colWidth/ratio + infoH)。
 * 用 1000 作分子避免精度损失。
 */
function getFileMeta(file: PendingFile, _index: number): MasonryItemMeta {
  const ratio = getRatio(file)
  if (ratio != null) {
    const desiredColSpan = ratio >= ULTRA_WIDE_RATIO_THRESHOLD
      ? 3
      : ratio >= WIDE_RATIO_THRESHOLD
        ? 2
        : 1
    const colSpan = Math.min(Math.max(desiredColSpan, 1), Math.max(approxColumns.value - 1, 1))
    // colSpan>1 时实际显示宽度更大，预览区高度按实际宽度算
    const refWidth = 1000 * colSpan
    const previewH = refWidth / ratio
    const totalH = previewH + CARD_INFO_HEIGHT
    return { colSpan, aspect: `${refWidth}:${totalH}`, lazy: true }
  }
  // 非图片：用 height 给定固定卡片总高，避免瀑布流里塌成一行
  return { height: 220, lazy: false }
}

// Masonry 实例引用。getMeta 是 prop getter 非响应式，需在数据/比例变化时手动刷新布局：
//  - pendingFiles 变化（增删文件）
//  - ratios 变化（preview 异步加载完成后拿到真实比例，getRatio 返回值随之改变）
const masonryRef = ref<InstanceType<typeof Masonry>>()
const refreshLayout = () => nextTick(() => masonryRef.value?.refresh())
watch([pendingFiles, ratios], refreshLayout, { flush: 'post', deep: true })

function handleFileClick(file: any, event: MouseEvent) {
  selectionBoxRef.value?.handleItemClick(file.id, event)
}

function handleSelectionUpdate(_ids: string[]) {
  // v-model 自动更新 selectedPendingIds
}

// 清空全部文件时一并清空左侧本地文件夹树
function handleClearAll() {
  clearAllPendingFiles()
  clearLocalTree()
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

/**
 * 右侧文件夹/标签面板刷新（新增/编辑/删除后触发）。
 * 仅重新拉取文件夹与标签以更新列表，不自动应用到待上传文件。
 */
async function handleFolderPanelRefresh() {
  if (!selectedLibraryId.value) return
  await loadFoldersAndTags(selectedLibraryId.value)
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
:deep(.selection-box) {
  background: rgba(59, 130, 246, 0.1);
  border: 2px solid rgba(59, 130, 246, 0.6);
  border-radius: 4px;
}
</style>
