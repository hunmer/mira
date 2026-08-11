<template>
  <Dialog :open="isVisible" @update:open="isVisible = $event">
    <DialogContent class="sm:max-w-[440px]">
      <DialogHeader>
        <DialogTitle class="sr-only">{{ $t('business.aboutDialog.title') }}</DialogTitle>
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
        <p class="text-muted-foreground text-sm mt-1">{{ $t('business.aboutDialog.subtitle') }}</p>

        <!-- 版本 -->
        <div class="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 rounded-full px-3 py-1">
          <span class="material-icons text-[14px]">tag</span>
          <span>v{{ appVersion }}</span>
          <span v-if="latestVersion && latestVersion !== appVersion" class="text-primary font-medium">
            · {{ $t('business.aboutDialog.latestVersion', { version: latestVersion }) }}
          </span>
        </div>

        <!-- 信息列表 -->
        <div class="w-full mt-5 space-y-2 text-left text-sm">
          <div class="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
            <span class="text-muted-foreground flex items-center gap-1.5">
              <span class="material-icons text-[16px]">person</span>{{ $t('business.aboutDialog.developer') }}
            </span>
            <span class="font-medium">Mira Team</span>
          </div>
          <div class="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
            <span class="text-muted-foreground flex items-center gap-1.5">
              <span class="material-icons text-[16px]">code</span>{{ $t('business.aboutDialog.techStack') }}
            </span>
            <span class="font-medium">Electron · Vue 3</span>
          </div>
          <button
            class="w-full flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 hover:bg-muted/70 transition-colors group"
            @click="openProjectUrl"
          >
            <span class="text-muted-foreground flex items-center gap-1.5">
              <span class="material-icons text-[16px]">link</span>{{ $t('business.aboutDialog.projectUrl') }}
            </span>
            <span class="font-medium text-primary inline-flex items-center gap-1">
              GitHub
              <span class="material-icons text-[16px] group-hover:translate-x-0.5 transition-transform">open_in_new</span>
            </span>
          </button>
        </div>

        <!-- 更新区域（仅 Electron 环境显示，dev 网页隐藏） -->
        <div v-if="environment.isElectron" class="w-full mt-5">
          <!-- 检查更新按钮 -->
          <button
            v-if="updateState === 'idle'"
            :disabled="!isUpdaterAvailable"
            class="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-white text-sm font-medium px-4 py-2.5 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            @click="checkForUpdates"
          >
            <span class="material-icons text-[18px]">system_update</span>
            {{ $t('business.aboutDialog.checkUpdate') }}
          </button>

          <!-- 检查中 -->
          <div
            v-else-if="updateState === 'checking'"
            class="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-muted text-muted-foreground text-sm font-medium px-4 py-2.5"
          >
            <span class="material-icons text-[18px] animate-spin">progress_activity</span>
            {{ $t('business.aboutDialog.checking') }}
          </div>

          <!-- 已是最新 -->
          <div
            v-else-if="updateState === 'not-available'"
            class="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400 text-sm font-medium px-4 py-2.5"
          >
            <span class="material-icons text-[18px]">check_circle</span>
            {{ $t('business.aboutDialog.upToDate') }}
          </div>

          <!-- 发现新版本 + 下载 -->
          <div v-else-if="updateState === 'available' || updateState === 'downloading'" class="space-y-2">
            <div class="rounded-xl bg-primary/10 text-primary px-3 py-2 text-sm">
              {{ $t('business.aboutDialog.newVersionFound') }} <span class="font-semibold">v{{ updateInfo?.version }}</span>
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
              {{ $t('business.aboutDialog.downloadUpdate') }}
            </button>
            <div
              v-else
              class="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-muted text-muted-foreground text-sm font-medium px-4 py-2.5"
            >
              <span class="material-icons text-[18px] animate-spin">progress_activity</span>
              {{ $t('business.aboutDialog.downloading', { percent: Math.round(downloadProgress ?? 0) }) }}
            </div>
          </div>

          <!-- 下载完成，重启安装 -->
          <button
            v-else-if="updateState === 'downloaded'"
            class="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 text-white text-sm font-medium px-4 py-2.5 hover:bg-green-700 transition-colors"
            @click="installUpdate"
          >
            <span class="material-icons text-[18px]">restart_alt</span>
            {{ $t('business.aboutDialog.downloaded') }}
          </button>

          <!-- 出错 -->
          <div
            v-else-if="updateState === 'error'"
            class="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-destructive/10 text-destructive text-sm font-medium px-4 py-2.5"
          >
            <span class="material-icons text-[18px]">error_outline</span>
            {{ errorMessage || $t('business.aboutDialog.checkFailed') }}
          </div>
        </div>

        <p class="mt-4 text-[11px] text-muted-foreground">Copyright © 2025 Mira Team. All rights reserved.</p>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@renderer/composables/useToast'
import { environment } from '@renderer/utils'
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
const { t } = useI18n()

const isVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value)
})

const PROJECT_URL = 'https://github.com/hunmer/mira'

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
      errorMessage.value = error?.message || t('business.aboutDialog.updateFailed')
      updateState.value = 'error'
    })
  )
}

const unregisterUpdaterEvents = () => {
  cleanups.forEach(fn => fn())
  cleanups.length = 0
}

const loadVersion = async () => {
  // 网页端降级：使用 vite 注入的 package.json 版本号
  if (!environment.isElectron) {
    appVersion.value = __APP_VERSION__
    return
  }
  try {
    const res = await window.electronAPI.updater.getVersion()
    if (res?.success) appVersion.value = res.version
  } catch {
    // 降级：使用 app.getVersion
    try {
      appVersion.value = await window.electronAPI.app.getVersion()
    } catch {
      appVersion.value = __APP_VERSION__
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
    toast.add({ severity: 'warn', detail: t('business.aboutDialog.updaterNotSupported'), life: 3000 })
    return
  }
  updateState.value = 'checking'
  errorMessage.value = ''
  const res = await api.check()
  if (!res.success) {
    updateState.value = 'error'
    errorMessage.value = res.error || t('business.aboutDialog.checkFailed')
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
    errorMessage.value = res.error || t('business.aboutDialog.downloadFailed')
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
