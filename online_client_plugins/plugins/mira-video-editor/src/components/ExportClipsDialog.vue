<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="sm:max-w-[800px]">
      <DialogHeader>
        <DialogTitle>导出所有片段</DialogTitle>
        <DialogDescription>
          选择导出去向和命名格式，{{ clipCount }} 个片段将被导出
        </DialogDescription>
      </DialogHeader>

      <div class="grid gap-4 py-4">
        <!-- 导出去向 -->
        <div class="grid gap-2">
          <Label>导出去向</Label>
          <Select v-model="exportAction" :disabled="isExporting">
            <SelectTrigger>
              <SelectValue placeholder="选择导出去向" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="download">下载到本机（浏览器下载）</SelectItem>
              <SelectItem value="library">保存到素材库</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- 命名格式 -->
        <div class="grid gap-2">
          <Label for="namePattern">命名格式</Label>
          <Input
            id="namePattern"
            v-model="namePattern"
            placeholder="输入命名格式"
            :disabled="isExporting"
          />
        </div>

        <!-- 预设选择 -->
        <div class="grid gap-2">
          <Label>预设格式</Label>
          <Select @update:modelValue="applyPreset" :disabled="isExporting">
            <SelectTrigger>
              <SelectValue placeholder="选择预设格式" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="{fileName}/{clipName}">
                {fileName}/{clipName} (含子目录)
              </SelectItem>
              <SelectItem value="{fileName}_{startTime}-{endTime}">
                {fileName}_{startTime}-{endTime}
              </SelectItem>
              <SelectItem value="{fileName}_片段{index}_{startTime}-{endTime}">
                {fileName}_片段{index}_{startTime}-{endTime}
              </SelectItem>
              <SelectItem value="{clipName}">
                {clipName} (片段注释)
              </SelectItem>
              <SelectItem value="{startTime}-{endTime}">
                {startTime}-{endTime} (时间范围)
              </SelectItem>
              <SelectItem value="{clipTags}">
                {clipTags} (片段标签)
              </SelectItem>
              <SelectItem value="{fileName}_{clipName}">
                {fileName}_{clipName}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- 变量说明 -->
        <div class="bg-muted/50 rounded-md p-3 text-sm">
          <div class="font-medium mb-1">可用变量：</div>
          <div class="text-muted-foreground space-y-1">
            <div>{fileName} - 文件名（不含后缀）</div>
            <div>{clipName} - 片段注释</div>
            <div>{clipTags} - 片段标签（用逗号合并）</div>
            <div>{startTime} / {endTime} - 开始/结束时间</div>
            <div>{index} - 片段序号（从1开始）</div>
          </div>
        </div>

        <!-- 预览 -->
        <div class="bg-muted/50 rounded-md p-3 text-sm overflow-hidden">
          <div class="font-medium mb-1">预览：</div>
          <div class="text-muted-foreground space-y-1 max-h-40 overflow-y-auto pr-2">
            <div
              v-for="(clip, index) in previewList"
              :key="index"
              class="truncate overflow-hidden text-ellipsis whitespace-nowrap w-full"
              :title="clip"
            >
              {{ index + 1 }}. {{ clip }}
            </div>
            <div v-if="previewList.length === 0" class="text-muted-foreground italic">
              无片段
            </div>
          </div>
        </div>

        <!-- 导出进度 -->
        <div v-if="isExporting" class="bg-muted/50 rounded-md p-3">
          <div class="flex items-center justify-between mb-2">
            <span class="font-medium">{{ progressMessage }}</span>
            <span class="text-sm text-muted-foreground">{{ progress }}%</span>
          </div>
          <div class="w-full bg-muted rounded-full h-2 mb-2">
            <div
              class="bg-primary h-2 rounded-full transition-all duration-300"
              :style="{ width: progress + '%' }"
            ></div>
          </div>
          <div class="flex items-center justify-between text-xs text-muted-foreground">
            <span>已完成 {{ completedCount }} / {{ totalCount }}</span>
            <span v-if="timeRemaining">预计剩余: {{ formatTimeRemaining(timeRemaining) }}</span>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button
          v-if="isExporting"
          variant="destructive"
          @click="cancelExport"
        >
          取消导出
        </Button>
        <Button v-else variant="outline" @click="isOpen = false">取消</Button>
        <Button @click="handleExport" :disabled="!canExport || isExporting">
          <span v-if="isExporting">导出中...</span>
          <span v-else>导出 {{ clipCount }} 个片段</span>
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Input } from 'mira-plugin-ui/src/components/ui/input'
import { Button } from 'mira-plugin-ui/src/components/ui/button'
import { Label } from 'mira-plugin-ui/src/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from 'mira-plugin-ui/src/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from 'mira-plugin-ui/src/components/ui/dialog'
import type { VideoClip, VideoData } from '@/types/video-editor'
import { v4 as uuidv4 } from 'uuid'
import { exportQueueManager, type ExportProgressCallback, type ExportCompleteCallback } from '../utils/exportQueueManager'
import { toast } from '@/lib/toast'
import { getTempDir } from '@/lib/exec'
import { isHostAvailable } from '@/lib/host'
import { pathJoin, sanitizeFileName } from '@/lib/path'
import { downloadToLocalFile, saveToLibrary } from '@/lib/download'

interface Props {
  video: VideoData | null
  clipCount: number
}

const props = defineProps<Props>()

const STORAGE_KEY = 'mira-video-editor:export-settings'

const isOpen = ref(false)
const exportAction = ref<'download' | 'library'>('download')
const namePattern = ref('{fileName}/{clipName}')
const isExporting = ref(false)
const progress = ref(0)
const progressMessage = ref('')
const completedCount = ref(0)
const totalCount = ref(0)
const timeRemaining = ref(0)
const currentJobId = ref('')

// 预设选项
const presets = [
  { label: '{fileName}/{clipName} (含子目录)', value: '{fileName}/{clipName}' },
  { label: '{fileName}_{startTime}-{endTime}', value: '{fileName}_{startTime}-{endTime}' },
  { label: '{fileName}_片段{index}_{startTime}-{endTime}', value: '{fileName}_片段{index}_{startTime}-{endTime}' },
  { label: '{clipName}', value: '{clipName}' },
  { label: '{startTime}-{endTime}', value: '{startTime}-{endTime}' },
  { label: '{clipTags}', value: '{clipTags}' },
  { label: '{fileName}_{clipName}', value: '{fileName}_{clipName}' }
]

// 加载保存的设置
function loadSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const settings = JSON.parse(saved)
      exportAction.value = settings.exportAction || 'download'
      namePattern.value = settings.namePattern || '{fileName}/{clipName}'
    }
  } catch (error) {
    console.warn('加载导出设置失败:', error)
  }
}

// 保存当前设置
function saveSettings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      exportAction: exportAction.value,
      namePattern: namePattern.value
    }))
  } catch (error) {
    console.warn('保存导出设置失败:', error)
  }
}

// 监听设置变化自动保存
watch([exportAction, namePattern], () => {
  saveSettings()
})

// 组件挂载时加载设置
onMounted(() => {
  loadSettings()
})

// 组件卸载时清理
onUnmounted(() => {
  if (currentJobId.value) {
    // 取消当前任务
    exportQueueManager.cancelJob(currentJobId.value)
  }
})

// 打开对话框
function open() {
  isOpen.value = true
  // 重置状态
  isExporting.value = false
  progress.value = 0
  progressMessage.value = ''
  completedCount.value = 0
  totalCount.value = 0
  timeRemaining.value = 0
  currentJobId.value = ''
}

// 应用预设
function applyPreset(value: string) {
  namePattern.value = value
}

// 格式化时间
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 10)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`
}

// 格式化剩余时间
function formatTimeRemaining(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}秒`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes < 60) return `${minutes}分${remainingSeconds}秒`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}小时${remainingMinutes}分`
}

// 生成单个片段名称
function generateClipName(clip: VideoClip, index: number): string {
  let name = namePattern.value

  // 替换变量
  if (props.video) {
    const fileName = props.video.title.replace(/\.[^/.]+$/, '')
    name = name.replace(/\{fileName\}/g, fileName)
  }
  name = name.replace(/\{clipName\}/g, clip.desc || `片段${index + 1}`)
  name = name.replace(/\{clipTags\}/g, clip.tags?.join(',') || '')
  name = name.replace(/\{startTime\}/g, formatTime(clip.start))
  name = name.replace(/\{endTime\}/g, formatTime(clip.end))
  name = name.replace(/\{index\}/g, String(index + 1))

  return name
}

// 预览列表
const previewList = computed(() => {
  if (!props.video) return []
  return Object.values(props.video.clips).map((clip, index) => generateClipName(clip, index))
})

// 能否导出
const canExport = computed(() => {
  return isHostAvailable() && namePattern.value && props.clipCount > 0
})

// 进度回调
const progressCallback: ExportProgressCallback = (progressData) => {
  if (progressData.jobId !== currentJobId.value) return

  progress.value = progressData.progress
  progressMessage.value = progressData.message
  completedCount.value = progressData.currentIndex
  totalCount.value = progressData.total
  timeRemaining.value = progressData.timeRemaining || 0
}

// 完成回调
const completeCallback: ExportCompleteCallback = (result) => {
  if (result.jobId !== currentJobId.value) return

  isExporting.value = false

  if (result.status === 'completed') {
    isOpen.value = false
    deliverExports(result.completedPaths)
  } else if (result.status === 'cancelled') {
    toast.info('导出已取消', '提示')
  } else {
    toast.error(`导出失败: ${result.error}`, '错误')
  }

  currentJobId.value = ''
}

// 导出
async function handleExport() {
  if (!canExport.value || !props.video) return

  // 检查是否为 blob URL 且没有 originalPath
  if (!props.video.originalPath && props.video.path.startsWith('blob:')) {
    toast.error('此视频无法导出：请重新添加视频文件以获取完整路径', '错误')
    return
  }

  const clips = Object.values(props.video.clips)
  const inputPath = props.video.originalPath || props.video.path

  // 输出到插件导出临时目录（完成后按去向下载/入库）
  const outputDir = await getTempDir('exports/batch')
  const exportClips = clips.map((clip, index) => {
    // 命名中的子目录分隔符展平（下载/入库没有目录结构）
    const clipName = sanitizeFileName(generateClipName(clip, index).replace(/\//g, '_'))
    const outputPath = pathJoin(outputDir, `${clipName}.mp4`)

    return {
      startTime: clip.start,
      endTime: clip.end,
      outputPath,
      desc: clip.desc || `片段${index + 1}`,
      index: index + 1
    }
  })

  try {
    isExporting.value = true
    totalCount.value = exportClips.length
    completedCount.value = 0
    progress.value = 0
    progressMessage.value = '正在准备导出...'

    // 添加到导出队列
    currentJobId.value = await exportQueueManager.addTask({
      id: uuidv4(),
      type: 'batch',
      inputPath,
      clips: exportClips,
      options: {
        quality: 'original',
        includeAudio: true,
        watermarkRegions: props.video.watermarks?.enabled
          ? props.video.watermarks.regions.map(r => ({
              x: r.x, y: r.y, w: r.w, h: r.h
            }))
          : undefined,
        videoWidth: props.video.metadata.width || 1920,
        videoHeight: props.video.metadata.height || 1080
      }
    })

  } catch (error) {
    isExporting.value = false
    console.error('添加导出任务失败:', error)
    toast.error(`添加导出任务失败: ${error}`, '错误')
  }
}

// 按去向交付导出产物（下载 / 保存到素材库）
async function deliverExports(paths: string[]) {
  if (exportAction.value === 'library') {
    toast.info(`正在保存 ${paths.length} 个片段到素材库...`, '处理中')
    let ok = 0
    for (const filePath of paths) {
      try {
        await saveToLibrary(filePath, filePath.split(/[\\/]/).pop())
        ok++
      } catch (error) {
        console.error('保存到素材库失败:', filePath, error)
      }
    }
    if (ok === paths.length) toast.success(`已保存 ${ok} 个片段到素材库`, '成功')
    else toast.warning(`保存到素材库完成：成功 ${ok} / ${paths.length}`, '提示')
  } else {
    toast.success(`导出完成，共 ${paths.length} 个片段，已开始下载`, '成功')
    for (const filePath of paths) {
      try {
        await downloadToLocalFile(filePath)
      } catch (error) {
        console.error('下载导出文件失败:', filePath, error)
      }
    }
  }
}

// 取消导出
function cancelExport() {
  if (currentJobId.value) {
    exportQueueManager.cancelJob(currentJobId.value)
  }
}

// 注册回调
const unregisterProgress = exportQueueManager.onProgress(progressCallback)
const unregisterComplete = exportQueueManager.onComplete(completeCallback)

defineExpose({ open })
</script>
