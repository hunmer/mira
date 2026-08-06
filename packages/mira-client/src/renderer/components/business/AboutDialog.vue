<template>
  <Dialog :open="isVisible" @update:open="isVisible = $event">
    <DialogContent class="sm:max-w-[440px]">
      <DialogHeader>
        <DialogTitle class="sr-only">关于 Mira</DialogTitle>
      </DialogHeader>

      <div class="flex flex-col items-center text-center -mt-2">
        <!-- 产品图标 -->
        <img
          :src="miraLogo"
          alt="Mira"
          class="size-20 rounded-2xl shadow-[0_12px_40px_var(--shadow-primary-md)] mb-4"
          draggable="false"
        />

        <h2 class="text-xl font-semibold tracking-tight">Mira Media Library</h2>
        <p class="text-muted-foreground text-sm mt-1">智能媒体素材管理库</p>

        <!-- 版本 -->
        <div class="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 rounded-full px-3 py-1">
          <span class="material-icons text-[14px]">tag</span>
          <span>v{{ appVersion }}</span>
          <span v-if="latestVersion && latestVersion !== appVersion" class="text-primary font-medium">
            · 最新 v{{ latestVersion }}
          </span>
        </div>

        <!-- 信息列表 -->
        <div class="w-full mt-5 space-y-2 text-left text-sm">
          <div class="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
            <span class="text-muted-foreground flex items-center gap-1.5">
              <span class="material-icons text-[16px]">person</span>开发者
            </span>
            <span class="font-medium">Mira Team</span>
          </div>
          <div class="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
            <span class="text-muted-foreground flex items-center gap-1.5">
              <span class="material-icons text-[16px]">code</span>技术栈
            </span>
            <span class="font-medium">Electron · Vue 3</span>
          </div>
          <button
            class="w-full flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 hover:bg-muted/70 transition-colors group"
            @click="openProjectUrl"
          >
            <span class="text-muted-foreground flex items-center gap-1.5">
              <span class="material-icons text-[16px]">link</span>项目地址
            </span>
            <span class="font-medium text-primary inline-flex items-center gap-1">
              GitHub
              <span class="material-icons text-[16px] group-hover:translate-x-0.5 transition-transform">open_in_new</span>
            </span>
          </button>
        </div>

        <!-- 更新区域 -->
        <div class="w-full mt-5">
          <!-- 检查更新按钮 -->
          <button
            v-if="updateState === 'idle'"
            :disabled="!isUpdaterAvailable"
            class="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-white text-sm font-medium px-4 py-2.5 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            @click="checkForUpdates"
          >
            <span class="material-icons text-[18px]">system_update</span>
            检查更新
          </button>

          <!-- 检查中 -->
          <div
            v-else-if="updateState === 'checking'"
            class="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-muted text-muted-foreground text-sm font-medium px-4 py-2.5"
          >
            <span class="material-icons text-[18px] animate-spin">progress_activity</span>
            正在检查更新…
          </div>

          <!-- 已是最新 -->
          <div
            v-else-if="updateState === 'not-available'"
            class="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400 text-sm font-medium px-4 py-2.5"
          >
            <span class="material-icons text-[18px]">check_circle</span>
            当前已是最新版本
          </div>

          <!-- 发现新版本 + 下载 -->
          <div v-else-if="updateState === 'available' || updateState === 'downloading'" class="space-y-2">
            <div class="rounded-xl bg-primary/10 text-primary px-3 py-2 text-sm">
              发现新版本 <span class="font-semibold">v{{ updateInfo?.version }}</span>
            </div>
            <div v-if="downloadProgress !== null" class="w-full h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                class="h-full bg-primary transition-[width] duration-200"
                :style="{ width: `${downloadProgress}%` }"
              />
            </div>
            <button
              v-if="updateState === 'available'"
              class="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-white text-sm font-medium px-4 py-2.5 hover:bg-primary/90 transition-colors"
              @click="downloadUpdate"
            >
              <span class="material-icons text-[18px]">download</span>
              下载更新
            </button>
            <div
              v-else
              class="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-muted text-muted-foreground text-sm font-medium px-4 py-2.5"
            >
              <span class="material-icons text-[18px] animate-spin">progress_activity</span>
              下载中 {{ Math.round(downloadProgress ?? 0) }}%
            </div>
          </div>

          <!-- 下载完成，重启安装 -->
          <button
            v-else-if="updateState === 'downloaded'"
            class="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 text-white text-sm font-medium px-4 py-2.5 hover:bg-green-700 transition-colors"
            @click="installUpdate"
          >
            <span class="material-icons text-[18px]">restart_alt</span>
            下载完成，重启并安装
          </button>

          <!-- 出错 -->
          <div
            v-else-if="updateState === 'error'"
            class="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-destructive/10 text-destructive text-sm font-medium px-4 py-2.5"
          >
            <span class="material-icons text-[18px]">error_outline</span>
            {{ errorMessage || '检查更新失败' }}
          </div>
        </div>

        <p class="mt-4 text-[11px] text-muted-foreground">Copyright © 2025 Mira Team. All rights reserved.</p>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@renderer/composables/useToast'
import miraLogo from '@/renderer/assets/mira-logo.png'

interface Props {
  visible: boolean
}

interface Emits {
  (e: 'update:visible', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const toast = useToast()

const isVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value)
})

const PROJECT_URL = 'https://github.com/hunmer/mira_typescript'

// 应用信息
const appVersion = ref('—')
const latestVersion = ref<string>('')

// 更新状态机：idle | checking | not-available | available | downloading | downloaded | error
type UpdateState = 'idle' | 'checking' | 'not-available' | 'available' | 'downloading' | 'downloaded' | 'error'
const updateState = ref<UpdateState>('idle')
const updateInfo = ref<{ version: string; releaseDate?: string } | null>(null)
const downloadProgress = ref<number | null>(null)
const errorMessage = ref('')

const isUpdaterAvailable = computed(() => Boolean(window.electronAPI?.updater))

// electron-updater 事件清理函数集合
const cleanups: Array<() => void> = []

const registerUpdaterEvents = () => {
  const api = window.electronAPI?.updater
  if (!api) return

  cleanups.push(
    api.onUpdateChecking(() => {
      updateState.value = 'checking'
    }),
    api.onUpdateAvailable((info: any) => {
      updateInfo.value = info
      latestVersion.value = info?.version ?? ''
      updateState.value = 'available'
    }),
    api.onUpdateNotAvailable((info: any) => {
      if (info?.version) latestVersion.value = info.version
      updateState.value = 'not-available'
    }),
    api.onUpdateDownloadProgress((progress: any) => {
      downloadProgress.value = progress?.percent ?? 0
      updateState.value = 'downloading'
    }),
    api.onUpdateDownloaded((info: any) => {
      if (info?.version) updateInfo.value = info
      downloadProgress.value = 100
      updateState.value = 'downloaded'
    }),
    api.onUpdateError((error: any) => {
      errorMessage.value = error?.message || '更新失败'
      updateState.value = 'error'
    })
  )
}

const unregisterUpdaterEvents = () => {
  cleanups.forEach(fn => fn())
  cleanups.length = 0
}

const loadVersion = async () => {
  try {
    const res = await window.electronAPI.updater.getVersion()
    if (res?.success) appVersion.value = res.version
  } catch {
    // 降级：使用 app.getVersion
    try {
      appVersion.value = await window.electronAPI.app.getVersion()
    } catch {
      appVersion.value = '—'
    }
  }
}

// 对话框打开时：加载版本 + 重置状态 + 注册事件
watch(
  () => props.visible,
  open => {
    if (open) {
      loadVersion()
      registerUpdaterEvents()
    } else {
      unregisterUpdaterEvents()
    }
  }
)

onBeforeUnmount(unregisterUpdaterEvents)

const checkForUpdates = async () => {
  const api = window.electronAPI?.updater
  if (!api) {
    toast.add({ severity: 'warn', detail: '当前环境不支持自动更新', life: 3000 })
    return
  }
  updateState.value = 'checking'
  errorMessage.value = ''
  const res = await api.check()
  if (!res.success) {
    updateState.value = 'error'
    errorMessage.value = res.error || '检查更新失败'
    return
  }
  // 有 updateInfo 表示有更新（onUpdateAvailable 也会把状态置为 available）
  if (res.updateInfo) {
    updateInfo.value = res.updateInfo
    latestVersion.value = res.updateInfo.version
    updateState.value = 'available'
  } else {
    updateState.value = 'not-available'
  }
}

const downloadUpdate = async () => {
  const res = await window.electronAPI.updater.download()
  if (!res.success) {
    updateState.value = 'error'
    errorMessage.value = res.error || '下载更新失败'
  } else {
    updateState.value = 'downloading'
  }
}

const installUpdate = () => {
  window.electronAPI.updater.install(true)
}

const openProjectUrl = () => {
  window.open(PROJECT_URL, '_blank')
}
</script>
