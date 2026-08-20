<template>
  <div class="w-full min-h-[400px]">
    <Tabs :model-value="currentTabValue" @update:model-value="updateCurrentTab" class="upload-tabs h-full bg-white rounded-xl shadow-sm overflow-hidden">
      <TabsList>
        <TabsTrigger
          value="upload-area"
          class="flex items-center gap-2"
        >
          <i class="pi pi-cloud-upload"></i>
          <span>{{ $t('commonUi.multiTabFileUpload.tabUploadArea') }}</span>
        </TabsTrigger>
        <TabsTrigger
          value="uploading"
          class="flex items-center gap-2"
        >
          <i class="pi pi-spin pi-spinner" v-if="uploadingFiles.length > 0"></i>
          <i class="pi pi-clock" v-else></i>
          <span>{{ $t('commonUi.multiTabFileUpload.tabUploading') }}</span>
          <Badge v-if="uploadingFiles.length > 0" variant="outline">{{ uploadingFiles.length }}</Badge>
        </TabsTrigger>
        <TabsTrigger
          value="uploaded"
          class="flex items-center gap-2"
        >
          <i class="pi pi-check-circle"></i>
          <span>{{ $t('commonUi.multiTabFileUpload.tabUploaded') }}</span>
          <Badge v-if="uploadedFiles.length > 0" variant="secondary">{{ uploadedFiles.length }}</Badge>
        </TabsTrigger>
      </TabsList>

      <div>
        <!-- 文件上传区域 -->
        <TabsContent value="upload-area">
          <div class="upload-area p-4">
            <div
              class="dropzone"
              :class="{ 'drag-over': isDragOver }"
              @drop.prevent="handleDrop"
              @dragover.prevent="handleDragOver"
              @dragleave.prevent="handleDragLeave"
              @click="triggerFileSelect"
            >
              <div class="flex flex-col items-center justify-center">
                <i class="pi pi-cloud-upload text-6xl text-primary mb-4"></i>
                <h3 class="text-xl font-semibold mb-2">{{ $t('commonUi.multiTabFileUpload.dragHere') }}</h3>
                <p class="text-muted-foreground mb-4">{{ $t('commonUi.multiTabFileUpload.orClickSelect') }}</p>
                <Button
                  variant="outline"
                  @click.stop="triggerFileSelect"
                >
                  <i class="pi pi-plus mr-2"></i>
                  {{ $t('commonUi.multiTabFileUpload.selectFiles') }}
                </Button>
              </div>
            </div>

            <!-- 隐藏的文件输入 -->
            <input
              ref="fileInput"
              type="file"
              multiple
              :accept="accept"
              class="hidden"
              @change="handleFileSelect"
            />

            <!-- 选中的文件预览 -->
            <div v-if="selectedFiles.length > 0" class="selected-files mt-4">
              <div class="flex items-center justify-between mb-3">
                <h4 class="font-semibold">{{ $t('commonUi.multiTabFileUpload.selectedFiles', { count: selectedFiles.length }) }}</h4>
                <Button
                  :disabled="selectedFiles.length === 0"
                  @click="startUpload"
                >
                  <i class="pi pi-upload mr-2"></i>
                  {{ $t('commonUi.multiTabFileUpload.startUpload') }}
                </Button>
              </div>
              <div class="file-list space-y-2">
                <div
                  v-for="(file, index) in selectedFiles"
                  :key="index"
                  class="file-item p-3 border border-border rounded-lg flex items-center justify-between"
                >
                  <div class="file-info flex items-center">
                    <i :class="getFileIcon(file)" class="text-2xl mr-3"></i>
                    <div>
                      <div class="font-medium">{{ file.name }}</div>
                      <div class="text-sm text-muted-foreground">{{ formatFileSize(file.size) }}</div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    class="rounded-full"
                    @click="removeSelectedFile(index)"
                  >
                    <i class="pi pi-times"></i>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <!-- 正在上传 -->
        <TabsContent value="uploading">
          <div class="uploading-area p-4">
            <div v-if="uploadingFiles.length === 0" class="opacity-80 text-center py-8">
              <i class="pi pi-info-circle text-4xl text-muted-foreground mb-4"></i>
              <p class="text-muted-foreground">{{ $t('commonUi.multiTabFileUpload.noUploading') }}</p>
            </div>

            <div v-else class="uploading-list space-y-3">
              <div
                v-for="(uploadItem, index) in uploadingFiles"
                :key="index"
                class="upload-item p-4 border border-border rounded-lg"
              >
                <div class="flex items-center justify-between mb-2">
                  <div class="file-info flex items-center">
                    <i :class="getFileIcon(uploadItem.file)" class="text-2xl mr-3"></i>
                    <div>
                      <div class="font-medium">{{ uploadItem.file.name }}</div>
                      <div class="text-sm text-muted-foreground">{{ formatFileSize(uploadItem.file.size) }}</div>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    class="rounded-full"
                    @click="cancelUpload(index)"
                  >
                    <i class="pi pi-times"></i>
                  </Button>
                </div>

                <!-- 进度条 -->
                <div class="mt-2">
                  <div class="flex justify-between text-sm mb-1">
                    <span>{{ uploadItem.status }}</span>
                    <span>{{ Math.round(uploadItem.progress) }}%</span>
                  </div>
                  <Progress
                    :model-value="uploadItem.progress"
                    class="h-2"
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <!-- 已上传 -->
        <TabsContent value="uploaded">
          <div class="uploaded-area" v-if="showUploadedFiles">
            <!-- 文件列表头部 -->
            <div class="flex justify-between items-center mb-4 p-4 pb-0">
              <div class="flex items-center">
                <h2 class="text-lg font-semibold text-foreground mr-2">{{ $t('commonUi.multiTabFileUpload.uploadedFiles') }}</h2>
                <span class="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {{ $t('commonUi.multiTabFileUpload.fileCount', { count: totalUploadedFiles }) }}
                </span>
              </div>

              <!-- 搜索和过滤 -->
              <div class="flex items-center space-x-4">
                <div class="relative">
                  <input
                    v-model="searchQuery"
                    class="pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    :placeholder="$t('commonUi.multiTabFileUpload.searchFiles')"
                    type="text"
                  />
                  <span class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">search</span>
                </div>

                <div class="relative">
                  <button
                    @click="showFilterMenu = !showFilterMenu"
                    class="flex items-center space-x-2 px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
                  >
                    <span class="material-icons">filter_list</span>
                    <span>{{ $t('commonUi.multiTabFileUpload.filter') }}</span>
                    <span v-if="activeFilters.length > 0" class="bg-primary text-white text-xs rounded-full px-2 py-0.5 ml-1">
                      {{ activeFilters.length }}
                    </span>
                  </button>

                  <!-- 过滤菜单 -->
                  <div
                    v-if="showFilterMenu"
                    class="absolute right-0 top-full mt-2 w-64 bg-white border border-border rounded-lg shadow-lg z-10"
                  >
                    <div class="p-4">
                      <div class="flex justify-between items-center mb-3">
                        <h3 class="font-medium text-foreground">{{ $t('commonUi.multiTabFileUpload.filters') }}</h3>
                        <button
                          @click="clearFilters"
                          class="text-xs text-muted-foreground hover:text-foreground underline"
                        >
                          {{ $t('commonUi.multiTabFileUpload.clearAll') }}
                        </button>
                      </div>
                      <h4 class="font-medium text-foreground mb-3 text-sm">{{ $t('commonUi.multiTabFileUpload.fileType') }}</h4>
                      <div class="space-y-2">
                        <label v-for="type in fileTypes" :key="type.value" class="flex items-center cursor-pointer">
                          <Checkbox
                            :model-value="selectedFileTypes.includes(type.value)"
                            @update:model-value="($event) => { if ($event) selectedFileTypes.push(type.value); else selectedFileTypes = selectedFileTypes.filter(v => v !== type.value) }"
                            class="mr-2"
                          />
                          <span class="text-sm text-foreground">{{ type.label }}</span>
                          <span class="text-xs text-muted-foreground ml-auto">({{ getFileCountByType(type.value) }})</span>
                        </label>
                      </div>

                      <hr class="my-4">

                      <h4 class="font-medium text-foreground mb-3 text-sm">{{ $t('commonUi.multiTabFileUpload.fileSize') }}</h4>
                      <RadioGroup :model-value="selectedFileSize" @update:model-value="selectedFileSize = String($event)" class="space-y-2">
                        <div v-for="size in fileSizes" :key="size.value" class="flex items-center">
                          <RadioGroupItem :value="size.value" class="mr-2" />
                          <span class="text-sm text-foreground">{{ size.label }}</span>
                        </div>
                      </RadioGroup>

                      <hr class="my-4">

                      <h4 class="font-medium text-foreground mb-3 text-sm">{{ $t('commonUi.multiTabFileUpload.uploadTime') }}</h4>
                      <div class="space-y-2">
                        <label v-for="time in uploadTimes" :key="time.value" class="flex items-center cursor-pointer">
                          <Checkbox
                            :model-value="selectedUploadTime.includes(time.value)"
                            @update:model-value="($event) => { if ($event) selectedUploadTime.push(time.value); else selectedUploadTime = selectedUploadTime.filter(v => v !== time.value) }"
                            class="mr-2"
                          />
                          <span class="text-sm text-foreground">{{ time.label }}</span>
                        </label>
                      </div>

                      <div class="flex justify-between mt-4 pt-4 border-t border-border">
                        <button
                          @click="clearFilters"
                          class="text-sm text-muted-foreground hover:text-foreground"
                        >
                          {{ $t('commonUi.multiTabFileUpload.clearFilter') }}
                        </button>
                        <button
                          @click="showFilterMenu = false"
                          class="text-sm bg-primary text-white px-3 py-1 rounded hover:bg-primary"
                        >
                          {{ $t('commonUi.multiTabFileUpload.apply') }}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="flex justify-between items-center mb-4 px-4">
              <p class="text-muted-foreground">{{ $t('commonUi.multiTabFileUpload.manageHint') }}</p>

              <div class="flex items-center space-x-2">
                <button
                  @click="handleClearAllFiles"
                  class="flex items-center space-x-2 px-3 py-1.5 border border-border rounded-lg text-foreground hover:bg-muted text-sm transition-colors"
                >
                  <span class="material-icons text-sm">delete_sweep</span>
                  <span>{{ $t('commonUi.multiTabFileUpload.clearAllFiles') }}</span>
                </button>

                <button
                  @click="handleRefreshFiles"
                  :disabled="isLoading"
                  class="flex items-center space-x-2 px-3 py-1.5 border border-border rounded-lg text-foreground hover:bg-muted text-sm transition-colors disabled:opacity-50"
                >
                  <span class="material-icons text-sm" :class="{ 'animate-spin': isLoading }">refresh</span>
                  <span>{{ $t('commonUi.multiTabFileUpload.refresh') }}</span>
                </button>
              </div>
            </div>

            <!-- 文件列表表格 -->
            <div class="px-4 pb-4">
              <div class="rounded-lg border border-border bg-card overflow-hidden">
                <div v-if="isLoading" class="p-8 text-center text-muted-foreground">
                  <div class="flex items-center justify-center">
                    <span class="material-icons animate-spin mr-2">refresh</span>
                    {{ $t('commonUi.multiTabFileUpload.loading') }}
                  </div>
                </div>
                <Table v-else>
                  <TableHeader>
                    <TableRow>
                      <TableHead class="w-12">
                        <Checkbox
                          :model-value="filteredUploadedFiles.length > 0 && selectedUploadedFiles.length === filteredUploadedFiles.length"
                          @update:model-value="toggleSelectAll"
                        />
                      </TableHead>
                      <TableHead class="cursor-pointer select-none" @click="toggleSort('name')">
                        {{ $t('commonUi.multiTabFileUpload.fileName') }}
                        <span v-if="sortField === 'name'" class="material-icons text-xs align-middle">
                          {{ sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward' }}
                        </span>
                      </TableHead>
                      <TableHead class="cursor-pointer select-none" @click="toggleSort('size')">
                        {{ $t('commonUi.multiTabFileUpload.fileSizeCol') }}
                        <span v-if="sortField === 'size'" class="material-icons text-xs align-middle">
                          {{ sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward' }}
                        </span>
                      </TableHead>
                      <TableHead class="cursor-pointer select-none" @click="toggleSort('uploadedAt')">
                        {{ $t('commonUi.multiTabFileUpload.uploadTimeCol') }}
                        <span v-if="sortField === 'uploadedAt'" class="material-icons text-xs align-middle">
                          {{ sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward' }}
                        </span>
                      </TableHead>
                      <TableHead>{{ $t('commonUi.multiTabFileUpload.operation') }}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow v-if="filteredUploadedFiles.length === 0">
                      <TableCell :colspan="5" class="p-8 text-center text-muted-foreground">
                        <div class="flex flex-col items-center">
                          <span class="material-icons text-4xl text-muted-foreground/50 mb-2">folder_open</span>
                          <p>{{ searchQuery ? $t('commonUi.multiTabFileUpload.noMatch') : $t('commonUi.multiTabFileUpload.noFiles') }}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                    <TableRow
                      v-for="data in filteredUploadedFiles"
                      :key="data.id"
                      :data-state="selectedUploadedFiles.includes(data.id) ? 'selected' : undefined"
                    >
                      <TableCell>
                        <Checkbox
                          :model-value="selectedUploadedFiles.includes(data.id)"
                          @update:model-value="toggleSelectFile(data.id)"
                        />
                      </TableCell>
                      <TableCell>
                        <div class="flex items-center">
                          <span class="material-icons mr-3" :class="getFileIconClass(data.mimeType)">
                            {{ getFileIconForMime(data.mimeType) }}
                          </span>
                          <div>
                            <p class="font-medium text-foreground">{{ data.name }}</p>
                            <p class="text-sm text-muted-foreground">{{ data.mimeType }}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{{ formatFileSize(data.size) }}</TableCell>
                      <TableCell>{{ formatDate(data.uploadedAt.toISOString()) }}</TableCell>
                      <TableCell>
                        <div class="flex items-center space-x-2">
                          <button
                            @click="handleDeleteFile(data)"
                            class="text-destructive hover:text-destructive/80 transition-colors"
                            :title="$t('commonUi.multiTabFileUpload.delete')"
                          >
                            <span class="material-icons">delete</span>
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <!-- 简化版已上传显示（当showUploadedFiles为false时） -->
          <div v-else class="uploaded-area p-4">
            <div v-if="uploadedFiles.length === 0" class="opacity-80 text-center py-8">
              <i class="pi pi-check-circle text-4xl text-muted-foreground mb-4"></i>
              <p class="text-muted-foreground">{{ $t('commonUi.multiTabFileUpload.noUploaded') }}</p>
            </div>

            <div v-else>
              <div class="flex items-center justify-between mb-4">
                <h4 class="font-semibold">{{ $t('commonUi.multiTabFileUpload.uploadedFilesCount', { count: uploadedFiles.length }) }}</h4>
                <Button
                  variant="destructive"
                  @click="clearUploadedFiles"
                >
                  <i class="pi pi-trash mr-2"></i>
                  {{ $t('commonUi.multiTabFileUpload.clearList') }}
                </Button>
              </div>

              <div class="uploaded-list space-y-2">
                <div
                  v-for="(uploadItem, index) in uploadedFiles"
                  :key="index"
                  class="uploaded-item p-3 border border-green-200 bg-green-50 rounded-lg flex items-center justify-between"
                >
                  <div class="file-info flex items-center">
                    <i :class="getFileIcon(uploadItem.file)" class="text-2xl mr-3 text-green-600"></i>
                    <div>
                      <div class="font-medium">{{ uploadItem.file.name }}</div>
                      <div class="text-sm text-muted-foreground">
                        {{ formatFileSize(uploadItem.file.size) }} •
                        {{ $t('commonUi.multiTabFileUpload.uploadedAt', { time: formatUploadTime(uploadItem.uploadedAt ?? new Date()) }) }}
                      </div>
                    </div>
                  </div>
                  <div class="actions flex items-center space-x-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger as-child>
                          <Button
                            variant="ghost"
                            class="rounded-full"
                            @click="downloadFile(uploadItem)"
                          >
                            <i class="pi pi-download"></i>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{{ $t('commonUi.multiTabFileUpload.download') }}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger as-child>
                          <Button
                            variant="destructive"
                            class="rounded-full"
                            @click="removeUploadedFile(index)"
                          >
                            <i class="pi pi-times"></i>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{{ $t('commonUi.multiTabFileUpload.delete') }}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </div>
    </Tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const { t } = useI18n()

interface UploadItem {
  file: File
  progress: number
  status: string
  uploadedAt?: Date
  id: string
}

interface UploadedFileItem {
  id: string
  name: string
  size: number
  mimeType: string
  uploadedAt: Date
  libraryId?: string
  libraryName?: string
  status: 'success' | 'failed'
  serverId?: string
  localPath?: string
  error?: string
}

interface Props {
  accept?: string
  maxFiles?: number
  autoUpload?: boolean
  // 已上传文件列表相关
  uploadedFilesList?: UploadedFileItem[]
  isLoading?: boolean
  showUploadedFiles?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  accept: '*',
  maxFiles: 10,
  autoUpload: false,
  uploadedFilesList: () => [],
  isLoading: false,
  showUploadedFiles: true
})

interface Emits {
  (e: 'files-selected', files: File[]): void
  (e: 'upload-start', files: File[]): void
  (e: 'upload-progress', item: UploadItem): void
  (e: 'upload-complete', item: UploadItem): void
  (e: 'upload-error', item: UploadItem, error: string): void
  (e: 'files-uploaded', items: UploadItem[]): void
  // 已上传文件列表相关事件
  (e: 'delete-file', file: UploadedFileItem): void
  (e: 'clear-all-files'): void
  (e: 'refresh-files'): void
  (e: 'sort-change', sortField: string, sortOrder: string): void
}

const emit = defineEmits<Emits>()

// 状态管理
const currentTabValue = ref('upload-area')
const isDragOver = ref(false)
const fileInput = ref<HTMLInputElement>()

// 文件列表
const selectedFiles = ref<File[]>([])
const uploadingFiles = ref<UploadItem[]>([])
const uploadedFiles = ref<UploadItem[]>([])

// 已上传文件列表相关状态
const searchQuery = ref('')
const showFilterMenu = ref(false)
const selectedUploadedFiles = ref<string[]>([])
const sortField = ref<'name' | 'size' | 'uploadedAt'>('uploadedAt')
const sortOrder = ref<'asc' | 'desc'>('desc')

// 表格交互：排序切换 / 行选择 / 全选
const toggleSort = (field: 'name' | 'size' | 'uploadedAt') => {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortOrder.value = 'asc'
  }
  emit('sort-change', sortField.value, sortOrder.value)
}
const toggleSelectFile = (id: string) => {
  const idx = selectedUploadedFiles.value.indexOf(id)
  if (idx === -1) {
    selectedUploadedFiles.value = [...selectedUploadedFiles.value, id]
  } else {
    selectedUploadedFiles.value = selectedUploadedFiles.value.filter(v => v !== id)
  }
}
const toggleSelectAll = (checked: boolean | string | number) => {
  if (checked === true) {
    selectedUploadedFiles.value = filteredUploadedFiles.value.map(f => f.id)
  } else {
    selectedUploadedFiles.value = []
  }
}

// 过滤相关
const selectedFileTypes = ref<string[]>([])
const selectedFileSize = ref<string>('')
const selectedUploadTime = ref<string[]>([])

// 过滤选项
const fileTypes = computed(() => [
  { value: 'image', label: t('commonUi.multiTabFileUpload.filterTypeImage') },
  { value: 'video', label: t('commonUi.multiTabFileUpload.filterTypeVideo') },
  { value: 'audio', label: t('commonUi.multiTabFileUpload.filterTypeAudio') },
  { value: 'document', label: t('commonUi.multiTabFileUpload.filterTypeDocument') },
  { value: 'archive', label: t('commonUi.multiTabFileUpload.filterTypeArchive') },
  { value: 'unknown', label: t('commonUi.multiTabFileUpload.filterTypeOther') }
])

const fileSizes = computed(() => [
  { value: '', label: t('commonUi.multiTabFileUpload.sizeAll') },
  { value: 'small', label: t('commonUi.multiTabFileUpload.sizeSmall') },
  { value: 'medium', label: t('commonUi.multiTabFileUpload.sizeMedium') },
  { value: 'large', label: t('commonUi.multiTabFileUpload.sizeLarge') },
  { value: 'xlarge', label: t('commonUi.multiTabFileUpload.sizeXlarge') }
])

const uploadTimes = computed(() => [
  { value: '', label: t('commonUi.multiTabFileUpload.timeAll') },
  { value: 'today', label: t('commonUi.multiTabFileUpload.timeToday') },
  { value: 'week', label: t('commonUi.multiTabFileUpload.timeWeek') },
  { value: 'month', label: t('commonUi.multiTabFileUpload.timeMonth') },
  { value: 'year', label: t('commonUi.multiTabFileUpload.timeYear') }
])

// 标签页切换处理
const updateCurrentTab = (value: string | number) => {
  currentTabValue.value = String(value)
}

// 文件选择处理
const triggerFileSelect = () => {
  fileInput.value?.click()
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files) {
    addFiles(Array.from(target.files))
  }
  // 清空输入框以允许重复选择同一文件
  target.value = ''
}

const handleDrop = (event: DragEvent) => {
  isDragOver.value = false
  if (event.dataTransfer?.files) {
    addFiles(Array.from(event.dataTransfer.files))
  }
}

const handleDragOver = () => {
  isDragOver.value = true
}

const handleDragLeave = () => {
  isDragOver.value = false
}

// 文件管理
const addFiles = (files: File[]) => {
  const validFiles = files.filter(file => {
    // 检查文件类型
    if (props.accept !== '*' && !isFileTypeAccepted(file)) {
      console.warn(`文件 ${file.name} 类型不支持`)
      return false
    }

    // 检查是否已存在
    if (selectedFiles.value.some(f => f.name === file.name && f.size === file.size)) {
      console.warn(`文件 ${file.name} 已存在`)
      return false
    }

    return true
  })

  // 检查总数限制
  const totalFiles = selectedFiles.value.length + validFiles.length
  if (totalFiles > props.maxFiles) {
    const allowedCount = props.maxFiles - selectedFiles.value.length
    validFiles.splice(allowedCount)
    console.warn(`最多只能选择 ${props.maxFiles} 个文件`)
  }

  selectedFiles.value.push(...validFiles)
  emit('files-selected', selectedFiles.value)

  if (props.autoUpload && validFiles.length > 0) {
    startUpload()
  }
}

const removeSelectedFile = (index: number) => {
  selectedFiles.value.splice(index, 1)
}

// 上传处理
const startUpload = () => {
  if (selectedFiles.value.length === 0) return

  // 将选中的文件移动到上传队列
  const filesToUpload = selectedFiles.value.map(file => ({
    file,
    progress: 0,
    status: t('commonUi.multiTabFileUpload.statusPreparing'),
    id: Date.now() + Math.random().toString(36).substr(2, 9)
  }))

  uploadingFiles.value.push(...filesToUpload)
  selectedFiles.value = []

  // 切换到正在上传标签页
  currentTabValue.value = 'uploading'

  emit('upload-start', filesToUpload.map(item => item.file))

  // 开始上传每个文件
  filesToUpload.forEach(item => {
    uploadFile(item)
  })
}

const uploadFile = async (item: UploadItem) => {
  try {
    item.status = t('commonUi.multiTabFileUpload.statusUploading')
    emit('upload-progress', item)

    // 模拟上传进度
    const uploadProgress = () => {
      return new Promise<void>((resolve) => {
        const interval = setInterval(() => {
          item.progress += Math.random() * 20
          if (item.progress >= 100) {
            item.progress = 100
            clearInterval(interval)
            resolve()
          }
          emit('upload-progress', item)
        }, 200)
      })
    }

    await uploadProgress()

    // 上传完成
    item.status = t('commonUi.multiTabFileUpload.statusCompleted')
    item.uploadedAt = new Date()

    // 从上传队列移动到已上传队列
    const index = uploadingFiles.value.findIndex(f => f.id === item.id)
    if (index !== -1) {
      uploadingFiles.value.splice(index, 1)
      uploadedFiles.value.unshift(item)
    }

    emit('upload-complete', item)

  } catch (error) {
    item.status = t('commonUi.multiTabFileUpload.statusFailed')
    emit('upload-error', item, error as string)
  }
}

const cancelUpload = (index: number) => {
  const item = uploadingFiles.value[index]
  if (item) {
    uploadingFiles.value.splice(index, 1)
    // 这里可以添加实际的上传取消逻辑
  }
}

// 已上传文件管理
const downloadFile = (item: UploadItem) => {
  // 创建下载链接
  const url = URL.createObjectURL(item.file)
  const a = document.createElement('a')
  a.href = url
  a.download = item.file.name
  a.click()
  URL.revokeObjectURL(url)
}

const removeUploadedFile = (index: number) => {
  uploadedFiles.value.splice(index, 1)
}

const clearUploadedFiles = () => {
  uploadedFiles.value = []
}

// 工具函数
const isFileTypeAccepted = (file: File): boolean => {
  if (props.accept === '*') return true

  const acceptTypes = props.accept.split(',').map(type => type.trim())

  return acceptTypes.some(type => {
    if (type.startsWith('.')) {
      return file.name.toLowerCase().endsWith(type.toLowerCase())
    }
    if (type.includes('/*')) {
      const baseType = type.split('/')[0]
      return file.type.startsWith(baseType)
    }
    return file.type === type
  })
}

const getFileIcon = (file: File): string => {
  const type = file.type
  const name = file.name.toLowerCase()

  if (type.startsWith('image/')) return 'pi pi-image text-primary'
  if (type.startsWith('video/')) return 'pi pi-video text-purple-500'
  if (type.startsWith('audio/')) return 'pi pi-volume-up text-green-500'
  if (type === 'application/pdf') return 'pi pi-file-pdf text-destructive'
  if (type.includes('word') || name.endsWith('.doc') || name.endsWith('.docx')) return 'pi pi-file-word text-primary'
  if (type.includes('sheet') || name.endsWith('.xls') || name.endsWith('.xlsx')) return 'pi pi-file-excel text-green-600'
  if (type.includes('zip') || type.includes('rar') || type.includes('archive')) return 'pi pi-file-archive text-yellow-500'

  return 'pi pi-file text-muted-foreground'
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatUploadTime = (date: Date): string => {
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 已上传文件列表相关计算属性和方法

// 根据 MIME 类型获取文件类型
const getFileType = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return 'document'
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return 'archive'
  return 'unknown'
}

// 活跃过滤器
const activeFilters = computed(() => {
  const filters = []
  if (selectedFileTypes.value.length > 0) filters.push(t('commonUi.multiTabFileUpload.activeFilterType'))
  if (selectedFileSize.value) filters.push(t('commonUi.multiTabFileUpload.activeFilterSize'))
  if (selectedUploadTime.value.length > 0) filters.push(t('commonUi.multiTabFileUpload.activeFilterTime'))
  return filters
})

// 按类型统计文件数量
const getFileCountByType = (type: string) => {
  return props.uploadedFilesList.filter(file => getFileType(file.mimeType) === type).length
}

// 搜索和过滤
const filteredUploadedFiles = computed(() => {
  let result = props.uploadedFilesList

  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(file =>
      file.name.toLowerCase().includes(query) ||
      file.mimeType?.toLowerCase().includes(query)
    )
  }

  // 文件类型过滤
  if (selectedFileTypes.value.length > 0) {
    result = result.filter(file => selectedFileTypes.value.includes(getFileType(file.mimeType)))
  }

  // 文件大小过滤
  if (selectedFileSize.value) {
    result = result.filter(file => {
      const size = file.size
      switch (selectedFileSize.value) {
        case 'small':
          return size < 1024 * 1024 // < 1MB
        case 'medium':
          return size >= 1024 * 1024 && size < 10 * 1024 * 1024 // 1MB - 10MB
        case 'large':
          return size >= 10 * 1024 * 1024 && size < 100 * 1024 * 1024 // 10MB - 100MB
        case 'xlarge':
          return size >= 100 * 1024 * 1024 // > 100MB
        default:
          return true
      }
    })
  }

  // 上传时间过滤
  if (selectedUploadTime.value.length > 0) {
    const now = new Date()
    result = result.filter(file => {
      const fileDate = new Date(file.uploadedAt)
      return selectedUploadTime.value.some(timeFilter => {
        switch (timeFilter) {
          case 'today':
            return fileDate.toDateString() === now.toDateString()
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            return fileDate >= weekAgo
          case 'month':
            const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
            return fileDate >= monthAgo
          case 'year':
            const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
            return fileDate >= yearAgo
          default:
            return true
        }
      })
    })
  }

  // 排序
  result.sort((a, b) => {
    let aValue: any = a[sortField.value]
    let bValue: any = b[sortField.value]

    if (sortField.value === 'size') {
      aValue = Number(aValue) || 0
      bValue = Number(bValue) || 0
    } else if (sortField.value === 'uploadedAt') {
      aValue = new Date(aValue).getTime()
      bValue = new Date(bValue).getTime()
    } else {
      aValue = String(aValue).toLowerCase()
      bValue = String(bValue).toLowerCase()
    }

    if (sortOrder.value === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })

  return result
})

// 总文件数
const totalUploadedFiles = computed(() => filteredUploadedFiles.value.length)

// 文件图标相关
const getFileIconForMime = (mimeType: string): string => {
  const type = getFileType(mimeType)
  const iconMap: Record<string, string> = {
    image: 'image',
    video: 'videocam',
    audio: 'audiotrack',
    document: 'description',
    archive: 'archive',
    unknown: 'insert_drive_file'
  }
  return iconMap[type] || iconMap.unknown
}

const getFileIconClass = (mimeType: string): string => {
  const type = getFileType(mimeType)
  const classMap: Record<string, string> = {
    image: 'text-green-500',
    video: 'text-primary',
    audio: 'text-purple-500',
    document: 'text-primary',
    archive: 'text-yellow-500',
    unknown: 'text-muted-foreground'
  }
  return classMap[type] || classMap.unknown
}

// 日期格式化
const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 事件处理
const handleDeleteFile = (file: UploadedFileItem) => {
  emit('delete-file', file)
}

const handleClearAllFiles = () => {
  emit('clear-all-files')
}

const handleRefreshFiles = () => {
  emit('refresh-files')
}

// 过滤器操作
const clearFilters = () => {
  selectedFileTypes.value = []
  selectedFileSize.value = ''
  selectedUploadTime.value = []
  showFilterMenu.value = false
}

// 暴露的方法
const clearAll = () => {
  selectedFiles.value = []
  uploadingFiles.value = []
  uploadedFiles.value = []
  currentTabValue.value = 'upload-area'
}

const getUploadStats = () => {
  return {
    selected: selectedFiles.value.length,
    uploading: uploadingFiles.value.length,
    uploaded: uploadedFiles.value.length,
    total: selectedFiles.value.length + uploadingFiles.value.length + uploadedFiles.value.length
  }
}

defineExpose({
  clearAll,
  getUploadStats,
  startUpload
})
</script>

<style scoped>
.dropzone {
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  padding: 3rem 2rem;
  text-align: center;
  background: #f9fafb;
  cursor: pointer;
  transition: all 0.3s ease;
}

.dropzone:hover,
.dropzone.drag-over {
  border-color: #6366f1;
  background: #eef2ff;
  transform: scale(1.02);
}

.file-item,
.upload-item,
.uploaded-item {
  transition: all 0.2s ease;
}

.file-item:hover,
.upload-item:hover,
.uploaded-item:hover {
  transform: translateY(-1px);
}

.actions {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.uploaded-item:hover .actions {
  opacity: 1;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .dropzone {
    background: #1f2937;
    border-color: #4b5563;
  }

  .dropzone:hover,
  .dropzone.drag-over {
    background: #312e81;
  }

  .file-item,
  .upload-item {
    background: #1f2937;
    border-color: #4b5563;
  }

  .uploaded-item {
    background: #064e3b;
    border-color: #065f46;
  }
}

/* 标签页图标动画 */
.upload-tabs .pi-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 标签页面板内容样式 */
.upload-tabs :deep(.bg-background) {
  background: #ffffff;
}
</style>