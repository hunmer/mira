<template>
  <div v-if="selectedVideo" class="clips-container">
    <div class="clips-header">
      <h3>已创建的片段</h3>
      <div class="clips-count">
        共 {{ Object.keys(selectedVideo.clips).length }} 个片段
      </div>
    </div>

    <div v-if="Object.keys(selectedVideo.clips).length === 0" class="empty-clips">
      <p>暂无片段，点击"剪辑工具"选项卡创建片段</p>
    </div>

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
            <span v-if="thumbnailLoading[clipId]" class="loading-spinner">⏳</span>
            <span v-else class="generate-hint">📷 点击生成封面</span>
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
          <Button @click="$emit('previewClip', clip)" variant="outline" size="sm" title="预览片段">
            ▶️
          </Button>
          <Button @click="$emit('editClip', clip)" variant="outline" size="sm" title="编辑">
            ✏️
          </Button>
          <Button
            @click="$emit('exportClip', clip)"
            variant="outline"
            size="sm"
            :title="isExporting && exportProgress ? exportProgress.message : '导出'"
            :disabled="isExporting && !!exportProgress"
          >
            {{ isExporting && exportProgress ? '⏳' : '💾' }}
          </Button>
          <Button @click="$emit('deleteClip', clipId)" variant="destructive" size="sm" title="删除">
            🗑️
          </Button>
        </div>
      </div>
    </div>

    <div v-if="Object.keys(selectedVideo.clips).length > 0" class="bulk-actions">
      <Button @click="$emit('exportAllClips')" variant="default" class="w-full">
        📦 导出所有片段 ({{ Object.keys(selectedVideo.clips).length }} 个)
      </Button>
    </div>
  </div>
  <div v-else class="empty-state">
    请先选择一个视频
  </div>
</template>

<script setup lang="ts">
import { Button } from 'mira-plugin-ui/src/components/ui/button'
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
  height: 100%;
  overflow-y: auto;
  padding: 20px;
}

.clips-header {
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.clips-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text);
}

.clips-count {
  font-size: 14px;
  color: var(--color-text-secondary);
  background: var(--color-surface);
  padding: 4px 12px;
  border-radius: 12px;
}

.empty-clips {
  text-align: center;
  padding: 40px 20px;
  color: var(--color-text-secondary);
}

.clips-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.clip-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s;
}

.clip-card:hover {
  background: var(--color-hover);
  border-color: var(--color-primary);
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
  gap: 6px;
  padding: 0 12px 12px;
}

.clip-actions :deep(.button) {
  flex: 1;
  justify-content: center;
  padding: 6px 8px;
}

.bulk-actions {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--color-border);
}

.empty-state {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  padding: 40px 20px;
  color: var(--color-text-secondary);
  font-size: 14px;
  text-align: center;
  background: var(--color-surface);
  border-radius: 8px;
  margin: 16px;
}
</style>
