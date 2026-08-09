<template>
  <div class="p-6 max-w-4xl mx-auto bg-muted min-h-screen dark:bg-muted">
    <div class="mb-6">
      <h2 class="text-2xl font-bold mb-2">{{ $t('commonUi.uploadExample.title') }}</h2>
      <p class="text-muted-foreground">{{ $t('commonUi.uploadExample.description') }}</p>
    </div>

    <!-- 组件配置面板 -->
    <Card class="mb-6">
      <CardHeader>
        <CardTitle class="flex items-center">
          <i class="pi pi-cog mr-2"></i>
          {{ $t('commonUi.uploadExample.configTitle') }}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="form-group">
            <label class="block text-sm font-medium mb-2 text-foreground dark:text-muted-foreground">{{ $t('commonUi.uploadExample.fileTypeLabel') }}</label>
            <Select v-model="accept">
              <SelectTrigger class="w-full">
                <SelectValue :placeholder="$t('commonUi.uploadExample.selectFileType')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="opt in acceptOptions"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="form-group">
            <label class="block text-sm font-medium mb-2 text-foreground dark:text-muted-foreground">{{ $t('commonUi.uploadExample.maxFileSize') }}</label>
            <Input
              type="number"
              :model-value="maxFileSizeMB"
              @update:model-value="maxFileSizeMB = Number($event)"
              min="1"
              max="100"
              class="w-full"
            />
          </div>

          <div class="form-group">
            <label class="block text-sm font-medium mb-2 text-foreground dark:text-muted-foreground">{{ $t('commonUi.uploadExample.maxFileCount') }}</label>
            <Input
              type="number"
              :model-value="maxFiles"
              @update:model-value="maxFiles = Number($event)"
              min="1"
              max="50"
              class="w-full"
            />
          </div>
        </div>

        <div class="mt-4">
          <div class="flex items-center">
            <Checkbox :model-value="Boolean(autoUpload)" @update:model-value="autoUpload = $event === true" />
            <label for="auto-upload" class="ml-2">{{ $t('commonUi.uploadExample.autoUpload') }}</label>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- 文件上传组件 -->
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center justify-between">
          <div class="flex items-center">
            <i class="pi pi-cloud-upload mr-2"></i>
            {{ $t('commonUi.uploadExample.uploadTitle') }}
          </div>
          <div class="flex items-center space-x-4 text-sm text-muted-foreground">
            <span>{{ $t('commonUi.uploadExample.selected', { count: uploadStats.selected }) }}</span>
            <span>{{ $t('commonUi.uploadExample.uploading', { count: uploadStats.uploading }) }}</span>
            <span>{{ $t('commonUi.uploadExample.uploaded', { count: uploadStats.uploaded }) }}</span>
            <Button
              variant="outline"
              size="sm"
              @click="clearAll"
            >
              <i class="pi pi-refresh mr-2"></i>
              {{ $t('commonUi.uploadExample.clearAll') }}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <MultiTabFileUpload
          ref="uploadComponent"
          :accept="accept"
          :max-file-size="maxFileSize"
          :max-files="maxFiles"
          :auto-upload="autoUpload"
          @files-selected="onFilesSelected"
          @upload-start="onUploadStart"
          @upload-progress="onUploadProgress"
          @upload-complete="onUploadComplete"
          @upload-error="onUploadError"
          @files-uploaded="onFilesUploaded"
        />
      </CardContent>
    </Card>

    <!-- 事件日志 -->
    <Card v-if="eventLog.length > 0" class="mt-6">
      <CardHeader>
        <CardTitle class="flex items-center justify-between">
          <div class="flex items-center">
            <i class="pi pi-list mr-2"></i>
            {{ $t('commonUi.uploadExample.eventLog') }}
          </div>
          <Button
            variant="outline"
            size="sm"
            @click="clearEventLog"
          >
            <i class="pi pi-trash mr-2"></i>
            {{ $t('commonUi.uploadExample.clearLog') }}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div class="event-log max-h-64 overflow-y-auto space-y-2 font-mono">
          <div
            v-for="(event, index) in eventLog"
            :key="index"
            class="event-item p-3 rounded-lg text-sm transition-all duration-200 ease-in-out hover:translate-x-1"
            :class="{
              'bg-primary border border-primary': event.type === 'info',
              'bg-green-50 border border-green-200': event.type === 'success',
              'bg-destructive border border-destructive': event.type === 'error',
              'bg-yellow-50 border border-yellow-200': event.type === 'warning'
            }"
          >
            <div class="flex items-start justify-between">
              <div>
                <div class="font-medium">{{ event.message }}</div>
                <div v-if="event.details" class="text-muted-foreground mt-1">
                  {{ event.details }}
                </div>
              </div>
              <div class="text-xs text-muted-foreground ml-4">
                {{ event.timestamp.toLocaleTimeString() }}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import MultiTabFileUpload from './MultiTabFileUpload.vue'

const { t } = useI18n()

interface EventLogItem {
  type: 'info' | 'success' | 'error' | 'warning'
  message: string
  details?: string
  timestamp: Date
}

interface UploadItem {
  file: File
  progress: number
  status: string
  uploadedAt?: Date
  id: string
}

// 配置项
const accept = ref('*')
const maxFileSizeMB = ref(10)
const maxFiles = ref(10)
const autoUpload = ref(false)

const acceptOptions = computed(() => [
  { label: t('commonUi.uploadExample.optAll'), value: '*' },
  { label: t('commonUi.uploadExample.optImage'), value: 'image/*' },
  { label: t('commonUi.uploadExample.optVideo'), value: 'video/*' },
  { label: t('commonUi.uploadExample.optAudio'), value: 'audio/*' },
  { label: t('commonUi.uploadExample.optPdf'), value: '.pdf' },
  { label: t('commonUi.uploadExample.optWord'), value: '.doc,.docx' },
  { label: t('commonUi.uploadExample.optExcel'), value: '.xls,.xlsx' },
  { label: t('commonUi.uploadExample.optArchive'), value: '.zip,.rar,.7z' }
])

// 计算属性
const maxFileSize = computed(() => maxFileSizeMB.value * 1024 * 1024)

// 组件引用
const uploadComponent = ref<InstanceType<typeof MultiTabFileUpload>>()

// 状态管理
const uploadStats = ref({
  selected: 0,
  uploading: 0,
  uploaded: 0,
  total: 0
})

const eventLog = ref<EventLogItem[]>([])

// 事件处理函数
const onFilesSelected = (files: File[]) => {
  addToEventLog('info', t('commonUi.uploadExample.msgFilesSelected'), t('commonUi.uploadExample.msgFilesSelectedDetail', { count: files.length }))
  updateStats()
}

const onUploadStart = (files: File[]) => {
  addToEventLog('info', t('commonUi.uploadExample.msgUploadStart'), t('commonUi.uploadExample.msgUploadStartDetail', { count: files.length }))
  updateStats()
}

const onUploadProgress = (_item: UploadItem) => {
  // 可以在这里添加进度相关的处理逻辑
  // 为了避免日志过多，这里不记录每次进度更新
}

const onUploadComplete = (item: UploadItem) => {
  addToEventLog('success', t('commonUi.uploadExample.msgUploadComplete'), t('commonUi.uploadExample.msgUploadCompleteDetail', { name: item.file.name, size: formatFileSize(item.file.size) }))
  updateStats()
}

const onUploadError = (item: UploadItem, error: string) => {
  addToEventLog('error', t('commonUi.uploadExample.msgUploadFailed'), t('commonUi.uploadExample.msgUploadFailedDetail', { name: item.file.name, error }))
  updateStats()
}

const onFilesUploaded = (items: UploadItem[]) => {
  addToEventLog('success', t('commonUi.uploadExample.msgBatchComplete'), t('commonUi.uploadExample.msgBatchCompleteDetail', { count: items.length }))
  updateStats()
}

// 工具函数
const addToEventLog = (type: EventLogItem['type'], message: string, details?: string) => {
  eventLog.value.unshift({
    type,
    message,
    details,
    timestamp: new Date()
  })

  // 限制日志数量
  if (eventLog.value.length > 50) {
    eventLog.value.splice(50)
  }
}

const updateStats = () => {
  if (uploadComponent.value) {
    uploadStats.value = uploadComponent.value.getUploadStats()
  }
}

const clearAll = () => {
  uploadComponent.value?.clearAll()
  updateStats()
  addToEventLog('info', t('commonUi.uploadExample.msgClearedAll'), '')
}

const clearEventLog = () => {
  eventLog.value = []
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
</script>
