<template>
  <div class="app-root">
    <VideoEditor />
    <!-- 设置入口（悬浮右上角，避免侵入编辑器布局） -->
    <button class="settings-fab" title="设置" @click="settingsOpen = true">
      <GearIcon style="width: 15px; height: 15px" />
    </button>
    <SettingsDialog v-model:open="settingsOpen" />
    <Toaster :theme="isDark ? 'dark' : 'light'" position="bottom-right" close-button />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Toaster } from 'vue-sonner'
import { GearIcon } from '@radix-icons/vue'
import VideoEditor from '@/components/index.vue'
import SettingsDialog from '@/components/SettingsDialog.vue'
import { getHost } from '@/lib/host'
import { ACTIVATE_MEDIA_EVENT } from '@/composables/useVideoEditorState'
import { toFileUrl } from '@/lib/path'
import { localVideoStorage } from '@/lib/localVideoStorage'
import { toast } from '@/lib/toast'
import type { VideoData } from '@/types/video-editor'

const settingsOpen = ref(false)
const isDark = ref(false)

/** 素材库右键发送的视频条目（宿主 index.js 序列化） */
interface IncomingMedia {
  id?: string
  name: string
  path?: string
  url?: string
  size?: number
  extension?: string
  duration?: number
  width?: number
  height?: number
  thumbnailURL?: string
}

/** 把右键发送的素材导入默认列表，返回导入数量 */
function importMediaItems(items: IncomingMedia[]): number {
  if (!Array.isArray(items) || items.length === 0) return 0

  let list = localVideoStorage.getLocalLists().find((l) => l.name === '素材库导入')
  if (!list) {
    list = localVideoStorage.createLocalList('素材库导入', '从 Mira 素材库右键发送的视频')
  }

  let count = 0
  const activatedVideoIds: string[] = []
  for (const item of items) {
    // 本地部署时 path 为服务器本机绝对路径（可直接交给 ffmpeg）；否则用 HTTP URL（仅可播放）
    const localPath = item.path || ''
    const playable = localPath ? toFileUrl(localPath) : item.url || ''
    if (!playable) continue

    // 跳过同路径的重复导入（重复发送时仍纳入激活定位）
    const existing = localVideoStorage
      .getLocalList(list.id)
      ?.videos.find((v) => v.path === playable || v.originalPath === localPath)
    if (existing) {
      activatedVideoIds.push(existing.id)
      continue
    }

    const videoData: VideoData = {
      id: crypto.randomUUID(),
      title: item.name || '未命名视频',
      duration: item.duration || 0,
      size: item.size || 0,
      path: playable,
      originalPath: localPath || undefined,
      clips: {},
      metadata: {
        width: item.width,
        height: item.height,
      },
      thumbnail: item.thumbnailURL || undefined,
      create_date: new Date().toISOString(),
    }
    localVideoStorage.addVideoToLocalList(list.id, videoData)
    activatedVideoIds.push(videoData.id)
    count++
  }

  // 导入后激活文件列表面板、选中「素材库导入」列表并播放最后一个视频
  if (activatedVideoIds.length > 0) {
    window.dispatchEvent(
      new CustomEvent(ACTIVATE_MEDIA_EVENT, {
        detail: { listId: list.id, videoId: activatedVideoIds[activatedVideoIds.length - 1] },
      })
    )
  }
  return count
}

/** 解析打开窗口时 query.media 携带的初始素材 */
async function importInitialMedia() {
  const host = getHost()
  if (!host) return
  try {
    const items = (await host.item.getSelected()) as unknown as IncomingMedia[]
    const count = importMediaItems(items)
    if (count > 0) toast.success(`已导入 ${count} 个素材库视频`, '视频剪辑器')
  } catch (error) {
    console.warn('解析初始素材失败:', error)
  }
}

let offMessage: (() => void) | null = null

onMounted(() => {
  const host = getHost()
  // 主题跟随宿主
  isDark.value = Boolean(host?.app?.isDarkColors?.())
  host?.onThemeChanged?.((payload: any) => {
    const dark = payload?.theme ? payload.theme === 'DARK' : Boolean(host.app?.isDarkColors?.())
    isDark.value = dark
    document.documentElement.classList.toggle('dark', dark)
  })
  document.documentElement.classList.toggle('dark', isDark.value)

  // 窗口已打开时，主窗口右键「发送到视频剪辑器」走 pluginWindow 消息增量导入
  offMessage = (window as any).electronAPI?.pluginWindow?.onMessage?.((channel: string, data: unknown) => {
    if (channel !== 'media:add') return
    const count = importMediaItems(data as IncomingMedia[])
    if (count > 0) toast.success(`已接收 ${count} 个素材库视频`, '视频剪辑器')
  }) || null

  importInitialMedia()
})

onUnmounted(() => {
  offMessage?.()
})
</script>

<style scoped>
.app-root {
  position: relative;
  width: 100%;
  height: 100%;
}

.settings-fab {
  position: absolute;
  top: 8px;
  right: 12px;
  z-index: 100;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--muted-foreground);
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  opacity: 0.55;
  transition: opacity 0.15s ease;
}

.settings-fab:hover {
  opacity: 1;
  color: var(--foreground);
}
</style>
