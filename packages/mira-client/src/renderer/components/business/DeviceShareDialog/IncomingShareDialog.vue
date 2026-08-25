<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Attachment, AttachmentContent, AttachmentDescription, AttachmentMedia, AttachmentTitle,
} from '@/components/ui/attachment'
import { Spinner } from '@/components/ui/spinner'
import { appService } from '@renderer/services'
import { incomingShare, sendShareAck } from '@renderer/composables/useDeviceShare'
import { useSettingsStore } from '@renderer/stores/settings'
import { receiveShareFiles } from './downloadShare'
import { cancelBinaryReceive } from './binaryTransfer'

/** 接收端：收到其他设备的分享请求后确认接收并下载（Electron 可选保存位置） */
const { t } = useI18n()
const settingsStore = useSettingsStore()

const open = computed({
  get: () => incomingShare.value !== null,
  set: (v: boolean) => { if (!v) incomingShare.value = null },
})

const files = computed(() => incomingShare.value?.files || [])
const fromLabel = computed(() => incomingShare.value?.fromLabel || incomingShare.value?.from || '')
// 默认取设置中的保存位置；对话框内选择是一次性的（不写回配置），每次打开恢复默认
const saveDir = ref<string>(settingsStore.settings.deviceShareSaveDir || '')
watch(open, (v) => { if (v) saveDir.value = settingsStore.settings.deviceShareSaveDir || '' })
const downloading = ref(false)
const downloadFailed = ref(false)
const downloadCanceled = ref(false)
const percent = ref(0)
/** 接收端取消：中断 URL/票据下载（xhr abort）+ 终止二进制接收会话 */
const abortController = ref<AbortController | null>(null)

/** 接收文件卡片状态：未开始=idle(虚线) 下载中=uploading(Spinner) 取消/失败=error */
const recvAttachState = computed(() => {
  if (downloading.value) return 'uploading' as const
  if (downloadFailed.value) return 'error' as const
  return 'idle' as const
})
const recvDescription = computed(() => {
  if (downloading.value) return t('business.deviceShare.downloading', { percent: Math.round(percent.value * 100) })
  if (downloadCanceled.value) return t('business.deviceShare.receiveCanceled')
  if (downloadFailed.value) return t('business.deviceShare.downloadFailed')
  return undefined
})

/** 文件扩展名 → material icon */
const fileIcon = (name?: string) => {
  const ext = (name || '').split('.').pop()?.toLowerCase() || ''
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'image'
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return 'movie'
  if (['mp3', 'wav', 'flac', 'ogg', 'm4a'].includes(ext)) return 'audiotrack'
  return 'description'
}

const formatSize = (n?: number) => {
  if (!n) return ''
  if (n > 1048576) return (n / 1048576).toFixed(1) + ' MB'
  if (n > 1024) return (n / 1024).toFixed(1) + ' KB'
  return n + ' B'
}

const selectSaveDir = async () => {
  const result = await (window as any).electronAPI?.fs?.selectDirectory(t('business.deviceShare.selectSaveDir'))
  if (result?.success && result.path) saveDir.value = result.path
}

const handleAccept = async () => {
  const message = incomingShare.value
  if (!message) return
  downloading.value = true
  downloadFailed.value = false
  downloadCanceled.value = false
  percent.value = 0
  abortController.value = new AbortController()
  try {
    const saved = await receiveShareFiles(message, {
      saveDir: saveDir.value || undefined,
      signal: abortController.value.signal,
      onProgress: (p, urlPercent) => {
        percent.value = p
        // 回传接收进度给发送端（sendShareAck 内部节流）；urlPercent 供发送端映射素材文件单文件状态
        sendShareAck(message.from, message.id, 'receiving', p, { urlPercent })
      },
    })
    sendShareAck(message.from, message.id, 'done', 1)
    toast.success(t('business.deviceShare.downloadDone', { count: saved.length }), {
      description: appService.isElectron && saveDir.value ? saved[0] : undefined,
    })
    incomingShare.value = null
  } catch (e) {
    console.error('[device-share] download failed', e)
    const canceled = e instanceof DOMException && e.name === 'AbortError'
      || /canceled/i.test(e instanceof Error ? e.message : String(e))
    downloadCanceled.value = canceled
    downloadFailed.value = true
    sendShareAck(message.from, message.id, 'failed')
    if (!canceled) {
      toast.error(t('business.deviceShare.downloadFailed'), {
        description: e instanceof Error ? e.message : String(e),
      })
    }
  } finally {
    downloading.value = false
    abortController.value = null
  }
}

/** 接收中取消：中断 URL/票据下载并终止二进制接收会话（弹窗保留，可重新点接收） */
const handleCancelReceive = () => {
  const message = incomingShare.value
  abortController.value?.abort()
  if (message?.id) cancelBinaryReceive(message.id, 'canceled')
}

const handleDecline = () => {
  const message = incomingShare.value
  if (message) sendShareAck(message.from, message.id, 'declined')
  incomingShare.value = null
}
</script>

<template>
  <Dialog :open="open" @update:open="open = $event">
    <DialogContent class="sm:max-w-[520px]">
      <DialogHeader>
        <DialogTitle>{{ $t('business.deviceShare.incomingTitle') }}</DialogTitle>
        <DialogDescription>
          {{ $t('business.deviceShare.incomingDesc', { from: fromLabel, count: files.length }) }}
        </DialogDescription>
      </DialogHeader>

      <div class="max-h-[260px] overflow-y-auto flex flex-col gap-2">
        <Attachment v-for="file in files" :key="file.id ?? file.name" size="sm" :state="recvAttachState" class="w-full">
          <AttachmentMedia variant="icon">
            <Spinner v-if="recvAttachState === 'uploading'" />
            <span v-else class="material-icons" :class="recvAttachState === 'error' && 'text-destructive'">
              {{ recvAttachState === 'error' ? 'warning' : fileIcon(file.name) }}
            </span>
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle :title="file.name">{{ file.name }}</AttachmentTitle>
            <AttachmentDescription>{{ recvDescription || formatSize(file.size) }}</AttachmentDescription>
          </AttachmentContent>
        </Attachment>
      </div>

      <!-- Electron：可选保存位置；Web：浏览器默认下载目录 -->
      <div v-if="appService.isElectron" class="flex items-center gap-2 text-sm">
        <span class="text-muted-foreground flex-none">{{ $t('business.deviceShare.saveTo') }}</span>
        <button
          class="flex-1 min-w-0 truncate text-left px-2 py-1.5 rounded-md border border-dashed border-border hover:bg-muted transition-colors"
          :title="saveDir || t('business.deviceShare.saveDirHint')"
          @click="selectSaveDir"
        >
          {{ saveDir || t('business.deviceShare.saveDirHint') }}
        </button>
        <span class="material-icons text-muted-foreground cursor-pointer" @click="selectSaveDir">folder_open</span>
      </div>
      <p v-else class="text-xs text-muted-foreground">
        {{ $t('business.deviceShare.webSaveHint') }}
      </p>

      <div v-if="downloading" class="h-1.5 rounded-full bg-muted overflow-hidden">
        <div class="h-full bg-primary transition-all" :style="{ width: `${Math.round(percent * 100)}%` }" />
      </div>

      <DialogFooter>
        <!-- 接收中：切换为取消下载（中断 URL 下载 + 终止二进制接收，弹窗保留可重试） -->
        <Button v-if="downloading" variant="outline" @click="handleCancelReceive">
          {{ $t('business.deviceShare.cancelDownload') }}
        </Button>
        <Button v-else variant="outline" @click="handleDecline">
          {{ $t('business.deviceShare.decline') }}
        </Button>
        <Button :disabled="downloading" @click="handleAccept">
          {{ downloading
            ? $t('business.deviceShare.downloading', { percent: Math.round(percent * 100) })
            : $t('business.deviceShare.accept') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
