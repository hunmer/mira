<template>
  <div v-if="selectedVideo" class="clips-container tab-card">
    <div class="clips-header">
      <h3>已创建的片段</h3>
      <div class="clips-count">
        共 {{ Object.keys(selectedVideo.clips).length }} 个片段
      </div>
    </div>

    <Empty v-if="Object.keys(selectedVideo.clips).length === 0" class="tab-empty">
      <EmptyMedia><ClipboardIcon style="width: 24px; height: 24px" /></EmptyMedia>
      <EmptyTitle>暂无片段</EmptyTitle>
      <EmptyDescription>点击"剪辑工具"选项卡创建片段</EmptyDescription>
    </Empty>

    <div v-else class="clips-grid">
      <div
        v-for="(clip, clipId) in selectedVideo.clips"
        :key="clipId"
        class="clip-card"
      >
        <div class="clip-thumbnail">
          <img
            v-if="clip.thumbnail || clipThumbnails[clipId]"
            :src="clip.thumbnail || clipThumbnails[clipId]"
            :alt="clip.desc || `片段 ${clipId.slice(0, 8)}`"
            @error="handleClipThumbnailError(clipId)"
          />
          <div v-else class="thumbnail-placeholder" @click="generateClipThumbnail(clip, clipId)">
            <span v-if="thumbnailLoading[clipId]" class="loading-spinner"><UpdateIcon style="width: 20px; height: 20px" /></span>
            <span v-else class="generate-hint"><CameraIcon style="width: 16px; height: 16px; vertical-align: -3px" /> 点击生成封面</span>
          </div>
        </div>
        <div class="clip-content">
          <div class="clip-title">{{ clip.desc || `片段 ${clipId.slice(0, 8)}` }}</div>
          <div class="clip-meta">
            {{ formatTime(clip.start) }} → {{ formatTime(clip.end) }}
            <span class="clip-duration">({{ formatDuration(clip.end - clip.start) }})</span>
          </div>
          <div v-if="clip.tags.length > 0" class="clip-tags">
            <span v-for="tag in clip.tags" :key="tag" class="tag">{{ tag }}</span>
          </div>
        </div>
        <div class="clip-actions">
          <Button @click="$emit('previewClip', clip)" variant="ghost" class="icon-btn" title="预览片段">
            <PlayIcon style="width: 14px; height: 14px" />
          </Button>
          <Button @click="$emit('editClip', clip)" variant="ghost" class="icon-btn" title="编辑">
            <Pencil1Icon style="width: 14px; height: 14px" />
          </Button>
          <Button
            @click="$emit('exportClip', clip)"
            variant="ghost"
            class="icon-btn"
            :title="isExporting && exportProgress ? exportProgress.message : '导出'"
            :disabled="isExporting && !!exportProgress"
          >
            <UpdateIcon v-if="isExporting && exportProgress" class="loading-spinner" style="width: 14px; height: 14px" />
            <DownloadIcon v-else style="width: 14px; height: 14px" />
          </Button>
          <Button @click="$emit('deleteClip', clipId)" variant="ghost" class="icon-btn danger" title="删除">
            <TrashIcon style="width: 14px; height: 14px" />
          </Button>
        </div>
      </div>
    </div>

    <div v-if="Object.keys(selectedVideo.clips).length > 0" class="bulk-actions">
      <Button @click="$emit('exportAllClips')" variant="default" class="w-full">
        <ArchiveIcon style="width: 14px; height: 14px" /> 导出所有片段 ({{ Object.keys(selectedVideo.clips).length }} 个)
      </Button>
    </div>
  </div>
  <Empty v-else class="tab-empty">
    <EmptyMedia><VideoIcon style="width: 24px; height: 24px" /></EmptyMedia>
    <EmptyTitle>请先选择一个视频</EmptyTitle>
    <EmptyDescription>在文件列表中选择视频后即可管理片段</EmptyDescription>
  </Empty>
</template>

<script setup lang="ts">
import { Button } from 'mira-plugin-ui/src/components/ui/button'
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from 'mira-plugin-ui/src/components/ui/empty'
import { UpdateIcon, CameraIcon, PlayIcon, Pencil1Icon, DownloadIcon, TrashIcon, ArchiveIcon, ClipboardIcon, VideoIcon } from '@radix-icons/vue'
import type { VideoData, VideoClip } from '@/types/video-editor'
import { formatTime, formatDuration } from '../utils/formatters'

defineProps<{
  selectedVideo: VideoData | null
  clipThumbnails: Record<string, string>
  thumbnailLoading: Record<string, boolean>
  isExporting: boolean
  exportProgress: { message: string; percent: number } | null
  generateClipThumbnail: (clip: VideoClip, clipId: string) => void
  handleClipThumbnailError: (clipId: string) => void
}>()

defineEmits<{
  previewClip: [clip: VideoClip]
  editClip: [clip: VideoClip]
  exportClip: [clip: VideoClip]
  deleteClip: [clipId: string]
  exportAllClips: []
}>()
</script>

<style scoped>
.clips-container {
  overflow-y: auto;
}

.clips-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.clips-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
}

.clips-count {
  font-size: 13px;
  color: var(--color-text-secondary);
  background: var(--color-background);
  padding: 4px 12px;
  border-radius: 12px;
}

.clips-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.clip-card {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s;
}

.clip-card:hover {
  background: var(--color-hover);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.clip-thumbnail {
  position: relative;
  width: 100%;
  height: 124px;
  background: #1a1a1a;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.clip-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
  transition: all 0.2s;
}

.thumbnail-placeholder:hover {
  background: linear-gradient(135deg, #3a3a3a 0%, #2a2a2a 100%);
}

.generate-hint {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 8px;
}

.loading-spinner {
  font-size: 24px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.clip-content {
  padding: 12px;
}

.clip-title {
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
}

.clip-meta {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}

.clip-duration {
  color: var(--color-primary);
  margin-left: 4px;
}

.clip-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.tag {
  font-size: 11px;
  background: var(--color-primary-light);
  color: var(--color-primary);
  padding: 2px 6px;
  border-radius: 4px;
}

.clip-actions {
  display: flex;
  gap: 4px;
  padding: 0 12px 12px;
}

.bulk-actions {
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}
</style>
