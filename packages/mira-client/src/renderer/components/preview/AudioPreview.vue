<template>
  <div class="audio-preview-view h-screen flex flex-col bg-muted dark:bg-muted text-[13px]">
    <!-- 顶部工具栏 -->
    <PreviewHeader :file-info="fileInfo" @renamed="$emit('renamed', $event)" @error="$emit('error', $event)">
      <template #left-extra>
        <div class="flex items-center space-x-2">
          <span
            class="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground"
          >
            <span class="material-symbols-outlined text-sm mr-1">folder</span>
            {{ fileInfo?.folderId || $t('preview.audioPreview.unknownFolder') }}
          </span>
          <span
            v-for="tag in fileInfo?.tags"
            :key="tag"
            class="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
          >
            <span class="material-symbols-outlined text-sm mr-1">label</span>
            {{ tag }}
          </span>
        </div>
      </template>
      <template #right-actions>
        <button class="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted">
          <span class="material-symbols-outlined text-muted-foreground">more_horiz</span>
        </button>
        <button
          class="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
          @click="closePreview"
        >
          <span class="material-icons text-muted-foreground">close</span>
        </button>
      </template>
    </PreviewHeader>

    <!-- 播放器区域 -->
    <div class="flex flex-grow items-center justify-center overflow-auto bg-background p-6">
      <MusicPlayer v-if="tracks.length" :tracks="tracks" />
      <div v-else class="text-center text-destructive">
        <p>{{ $t('preview.audioPreview.noAudioUrl') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PreviewHeader from './PreviewHeader.vue'
import { MusicPlayer, type Track } from '@renderer/components/ui/music-player-widget'
import { getMediaPreviewSource } from '@renderer/utils/fileUtils'

interface Props {
  fileInfo: any
}

const props = defineProps<Props>()
defineEmits<{
  error: [message: string]
  renamed: [name: string]
}>()

const router = useRouter()
const { t } = useI18n()

// 文件名去掉扩展名作为标题
const baseTitle = (name?: string): string => {
  if (!name) return t('preview.audioPreview.unknownTitle')
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.substring(0, dot) : name
}

// 单文件 → 单 track 列表（保留多 track 结构便于将来扩展）
const tracks = computed<Track[]>(() => {
  const file = props.fileInfo
  if (!file) return []
  const src = getMediaPreviewSource(file)
  if (!src) return []
  return [
    {
      title: baseTitle(file.name || file.title),
      artist: file.metadata?.artist || file.metadata?.album || t('preview.audioPreview.unknownArtist'),
      cover: file.thumbnailPath || '',
      src,
    },
  ]
})

const closePreview = () => {
  if (window.history.length > 1) router.back()
  else router.push('/')
}
</script>

<style scoped>
.material-icons,
.material-symbols-outlined {
  font-size: 18px;
}
.material-symbols-outlined.text-sm {
  font-size: 16px;
}
</style>
