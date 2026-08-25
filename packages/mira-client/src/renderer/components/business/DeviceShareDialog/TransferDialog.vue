<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Attachment, AttachmentContent, AttachmentDescription, AttachmentMedia, AttachmentTitle,
} from '@/components/ui/attachment'
import { deviceTransfers, transferDialogOpen, clearFinishedTransfers, type DeviceTransferItem } from './useDeviceTransfers'

/**
 * 设备传输对话框：展示「发送到设备」的待接收列表与对端回传的接收进度。
 * 数据在模块级 useDeviceTransfers 中（关闭重开不丢，可恢复查看）。
 */
const { t } = useI18n()

const open = computed({
  get: () => transferDialogOpen.value,
  set: (v: boolean) => { transferDialogOpen.value = v },
})

const hasFinished = computed(() =>
  deviceTransfers.value.some(item => item.state !== 'sent' && item.state !== 'receiving'))

const formatSize = (n?: number) => {
  if (!n) return ''
  if (n > 1048576) return (n / 1048576).toFixed(1) + ' MB'
  if (n > 1024) return (n / 1024).toFixed(1) + ' KB'
  return n + ' B'
}

/** attachment state 映射：等待接收=processing(微光) 接收中=uploading 完成=done 失败/拒绝=error */
const attachState = (item: DeviceTransferItem) => ({
  sent: 'processing',
  receiving: 'uploading',
  done: 'done',
  failed: 'error',
  declined: 'error',
} as const)[item.state]

const stateText = (item: DeviceTransferItem) => ({
  sent: t('business.deviceShare.transferSent'),
  receiving: t('business.deviceShare.transferReceiving', { percent: Math.round(item.percent * 100) }),
  done: t('business.deviceShare.transferDone'),
  failed: t('business.deviceShare.transferFailed'),
  declined: t('business.deviceShare.transferDeclined'),
} as const)[item.state]

/** 文件扩展名 → material icon */
const fileIcon = (name?: string) => {
  const ext = (name || '').split('.').pop()?.toLowerCase() || ''
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'image'
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return 'movie'
  if (['mp3', 'wav', 'flac', 'ogg', 'm4a'].includes(ext)) return 'audiotrack'
  return 'description'
}

const titleOf = (item: DeviceTransferItem) => {
  const first = item.files[0]?.name || '-'
  return item.files.length > 1
    ? t('business.deviceShare.transferFilesTitle', { name: first, count: item.files.length })
    : first
}

const timeAgo = (ts: number) => {
  const elapsed = Math.max(0, Date.now() - ts)
  if (elapsed < 60000) return t('business.deviceShare.justNow')
  return t('business.deviceShare.minutesAgo', { n: Math.floor(elapsed / 60000) })
}
</script>

<template>
  <Dialog :open="open" @update:open="open = $event">
    <DialogContent class="sm:max-w-[520px]">
      <DialogHeader>
        <DialogTitle>{{ $t('business.deviceShare.transferTitle') }}</DialogTitle>
        <DialogDescription>{{ $t('business.deviceShare.transferDesc') }}</DialogDescription>
      </DialogHeader>

      <div class="max-h-[420px] overflow-y-auto flex flex-col gap-2">
        <p v-if="deviceTransfers.length === 0" class="text-sm text-muted-foreground text-center py-10">
          {{ $t('business.deviceShare.transferEmpty') }}
        </p>

        <Attachment v-for="item in deviceTransfers" :key="item.id" :state="attachState(item)" class="w-full">
          <AttachmentMedia variant="icon">
            <span class="material-icons">{{ fileIcon(item.files[0]?.name) }}</span>
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle :title="titleOf(item)">{{ titleOf(item) }}</AttachmentTitle>
            <AttachmentDescription class="truncate">
              {{ stateText(item) }} · {{ item.targetLabel }} · {{ formatSize(item.files.reduce((s, f) => s + (f.size || 0), 0)) }}
            </AttachmentDescription>
            <Progress v-if="item.state === 'receiving'" :model-value="Math.round(item.percent * 100)" class="h-1.5 mt-1" />
          </AttachmentContent>
          <span class="text-xs text-muted-foreground flex-none pr-1.5 self-start pt-1">{{ timeAgo(item.updatedAt) }}</span>
        </Attachment>
      </div>

      <DialogFooter>
        <Button variant="outline" :disabled="!hasFinished" @click="clearFinishedTransfers">
          {{ $t('business.deviceShare.transferClear') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
