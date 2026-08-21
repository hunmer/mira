<template>
  <div class="video-list-sidebar">
    <!-- 本地列表 -->
    <div class="list-manager">
      <!-- 列表分组按钮 -->
      <div class="list-group-buttons">
        <div
          v-for="list in localLists"
          :key="list.id"
          :class="['group-btn', { active: selectedLocalListId === list.id }]"
          @click="selectedLocalListId = list.id"
        >
          <span class="group-btn-name">{{ list.name }}</span>
          <button
            class="group-btn-delete"
            @click.stop="deleteLocalList(list.id)"
            title="删除分组"
          >
            ✕
          </button>
        </div>
        <button class="group-btn group-btn-add" @click="showCreateListDialog" title="新建分组">
          +
        </button>
      </div>

      <!-- 添加文件按钮 -->
      <div class="actions">
        <input
          ref="fileInputRef"
          type="file"
          accept="video/*"
          multiple
          @change="handleFileUpload"
          style="display: none"
        />
        <Button @click="triggerFileSelect" variant="default" class="flex-1">
          📁 添加本地文件（支持多选）
        </Button>
        <Button @click="clearCurrentList" variant="destructive" :disabled="currentLocalVideos.length === 0" title="清空当前列表">
          🗑️
        </Button>
      </div>

      <!-- 视频列表 -->
      <div class="video-list">
        <div
          v-for="video in currentLocalVideos"
          :key="video.id"
          :class="['video-item', { active: selectedVideo?.id === video.id }]"
          @click="selectVideo(video)"
        >
          <div class="thumbnail-wrapper">
            <img v-if="video.thumbnail" :src="video.thumbnail" class="thumbnail" />
            <div v-else class="thumbnail-placeholder">🎬</div>
            <div class="play-indicator">▶️</div>
          </div>
          <div class="video-info">
            <div class="title">{{ video.title }}</div>
            <div class="meta">
              {{ formatDuration(video.duration) }} | {{ formatSize(video.size) }}
            </div>
          </div>
          <button @click.stop="removeVideo(video)" class="btn-remove" title="删除">
            ✕
          </button>
        </div>
      </div>
    </div>

    <!-- 新建列表对话框 -->
    <Dialog v-model:open="createListDialogOpen">
      <DialogContent class="dialog-content">
        <DialogTitle>新建视频列表</DialogTitle>
        <div class="form-group">
          <label>列表名称</label>
          <input v-model="newListName" type="text" placeholder="输入列表名称" class="input" />
        </div>
        <div class="form-group">
          <label>描述（可选）</label>
          <textarea
            v-model="newListDescription"
            placeholder="输入列表描述"
            class="textarea"
            rows="3"
          />
        </div>
        <div class="dialog-actions">
          <Button @click="createListDialogOpen = false" variant="secondary">取消</Button>
          <Button @click="createList" variant="default">创建</Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogTitle
} from 'mira-plugin-ui/src/components/ui/dialog'
import { Button } from 'mira-plugin-ui/src/components/ui/button'
import type { VideoData } from '@/types/video-editor'
import { localVideoStorage } from '@/lib/localVideoStorage'
import { getHost, isHostAvailable } from '@/lib/host'
import { getTempDir } from '@/lib/exec'
import { generateThumbnail as ffmpegGenerateThumbnail } from '@/lib/ffmpeg'
import { pathJoin, toFileUrl } from '@/lib/path'

// Props & Emits
const emit = defineEmits<{
  videoSelected: [video: VideoData, listId?: string]
}>()

// State
const localLists = ref(localVideoStorage.getLocalLists())
const selectedLocalListId = ref<string>(localStorage.getItem('mira-video-editor:lastLocalListId') || '')
const selectedVideo = ref<VideoData | null>(null)

// 创建列表相关
const createListDialogOpen = ref(false)
const newListName = ref('')
const newListDescription = ref('')

// 文件选择相关
const fileInputRef = ref<HTMLInputElement | null>(null)

// Computed
const currentLocalList = computed(() =>
  localLists.value.find(l => l.id === selectedLocalListId.value)
)

const currentLocalVideos = computed(() => currentLocalList.value?.videos || [])

// Methods
function loadLists() {
  localLists.value = localVideoStorage.getLocalLists()

  // 首次使用时创建默认列表，避免添加文件流程因没有目标列表而静默返回。
  if (localLists.value.length === 0) {
    const defaultList = localVideoStorage.createLocalList('默认列表')
    localLists.value = [defaultList]
  }

  // 自动选择第一个列表（如果还没有选择的话）
  if (localLists.value.length > 0 && !selectedLocalListId.value) {
    selectedLocalListId.value = localLists.value[0].id
  }

  // 验证当前选择的列表是否仍然存在
  if (selectedLocalListId.value && !localLists.value.find(l => l.id === selectedLocalListId.value)) {
    selectedLocalListId.value = localLists.value.length > 0 ? localLists.value[0].id : ''
  }

  // 恢复上次选中的视频
  const lastVideoId = localStorage.getItem('mira-video-editor:lastVideoId')
  if (lastVideoId && selectedLocalListId.value) {
    const list = localLists.value.find(l => l.id === selectedLocalListId.value)
    const video = list?.videos.find(v => v.id === lastVideoId)
    if (video) {
      selectedVideo.value = video
      emit('videoSelected', video, selectedLocalListId.value)
    }
  }
}

function showCreateListDialog() {
  newListName.value = ''
  newListDescription.value = ''
  createListDialogOpen.value = true
}

function triggerFileSelect() {
  // 统一走浏览器文件选择（宿主环境经 mira.fs.getPathForFile 还原真实路径）
  if (!selectedLocalListId.value) {
    const defaultList = localVideoStorage.createLocalList('默认列表')
    localLists.value = localVideoStorage.getLocalLists()
    selectedLocalListId.value = defaultList.id
  }
  fileInputRef.value?.click()
}

/** 后台生成列表缩略图（ffmpeg 截取 1s 处，失败静默） */
async function generateListThumbnail(videoId: string, videoPath: string) {
  if (!isHostAvailable()) return
  try {
    const outputDir = await getTempDir('list-thumbs')
    const outputPath = pathJoin(outputDir, `${videoId}.jpg`)
    await ffmpegGenerateThumbnail({ inputPath: videoPath, outputPath, timestamp: 1, width: 160, height: 90 })
    const thumbnailUrl = toFileUrl(outputPath)
    const updated = localVideoStorage.updateVideoInLocalList(selectedLocalListId.value, videoId, { thumbnail: thumbnailUrl })
    if (updated) {
      localLists.value = localVideoStorage.getLocalLists()
    }
  } catch (error) {
    console.warn('生成视频缩略图失败:', error)
  }
}

async function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (!files || files.length === 0 || !selectedLocalListId.value) return

  try {
    const host = getHost()

    // 处理多个文件
    for (const file of Array.from(files)) {
      // 宿主环境下还原文件真实路径（导出/截图需要）；拿不到时退化为 blob URL
      let filePath: string | undefined
      try {
        filePath = host?.fs?.getPathForFile?.(file) || undefined
      } catch {
        filePath = undefined
      }

      const videoData: VideoData = {
        id: crypto.randomUUID(),
        title: file.name,
        duration: 0, // 需要后续通过 video 元素获取
        size: file.size,
        path: filePath ? toFileUrl(filePath) : URL.createObjectURL(file),
        originalPath: filePath || undefined,
        clips: {},
        metadata: {},
        thumbnail: undefined,
        create_date: new Date().toISOString()
      }

      // 添加到本地列表
      localVideoStorage.addVideoToLocalList(selectedLocalListId.value, videoData)

      // 后台生成列表缩略图（异步，不阻塞）
      if (filePath) {
        generateListThumbnail(videoData.id, filePath)
      }
    }

    // 刷新本地列表
    localLists.value = localVideoStorage.getLocalLists()

    // 清空文件输入
    target.value = ''
  } catch (error) {
    console.error('Failed to add local video:', error)
  }
}

function createList() {
  if (!newListName.value.trim()) return

  try {
    // 创建本地列表
    const newList = localVideoStorage.createLocalList(
      newListName.value,
      newListDescription.value
    )
    localLists.value.push(newList)
    selectedLocalListId.value = newList.id
    createListDialogOpen.value = false
  } catch (error) {
    console.error('Failed to create list:', error)
    createListDialogOpen.value = false
  }
}

async function removeVideo(video: VideoData) {
  try {
    // 从本地列表删除
    if (selectedLocalListId.value) {
      localVideoStorage.removeVideoFromLocalList(selectedLocalListId.value, video.id)
      localLists.value = localVideoStorage.getLocalLists()
    }

    if (selectedVideo.value?.id === video.id) {
      selectedVideo.value = null
      localStorage.removeItem('mira-video-editor:lastVideoId')
    }
  } catch (error) {
    console.error('Failed to remove video:', error)
  }
}

function selectVideo(video: VideoData) {
  selectedVideo.value = video
  localStorage.setItem('mira-video-editor:lastVideoId', video.id)
  emit('videoSelected', video, selectedLocalListId.value)
}

function clearCurrentList() {
  if (!selectedLocalListId.value || currentLocalVideos.value.length === 0) return
  if (!confirm(`确定要清空列表中的所有视频吗？`)) return
  localVideoStorage.updateLocalList(selectedLocalListId.value, { videos: [] })
  localLists.value = localVideoStorage.getLocalLists()
  selectedVideo.value = null
  localStorage.removeItem('mira-video-editor:lastVideoId')
}

async function deleteLocalList(listId: string) {
  const list = localLists.value.find(l => l.id === listId)
  if (!list) return

  const confirmResult = confirm(`确定要删除列表 "${list.name}" 吗？此操作将同时删除列表中的所有视频。`)
  if (!confirmResult) return

  try {
    localVideoStorage.deleteLocalList(listId)
    localLists.value = localVideoStorage.getLocalLists()

    if (selectedLocalListId.value === listId) {
      selectedLocalListId.value = localLists.value.length > 0 ? localLists.value[0].id : ''
      selectedVideo.value = null
    }
  } catch (error) {
    console.error('Failed to delete local list:', error)
    alert('删除失败，请重试')
  }
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    : `${m}:${s.toString().padStart(2, '0')}`
}

function formatSize(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(2)} MB`
}

// Watch
watch(selectedLocalListId, (newId) => {
  if (newId) {
    localStorage.setItem('mira-video-editor:lastLocalListId', newId)
  }
})

// Lifecycle
onMounted(() => {
  loadLists()
})

// 暴露方法给父组件
defineExpose({
  refreshLocalLists: () => {
    localLists.value = localVideoStorage.getLocalLists()
  },
  loadLists
})
</script>

<style scoped src="./VideoListSidebar.css"></style>
