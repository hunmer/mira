<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import QRCode from 'qrcode'
import { toast } from 'vue-sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import DeviceListPicker from './DeviceListPicker.vue'
import {
  shareDialogOpen, shareFiles, getSelfClientId, buildPairUrl, resolveServerOrigin, createShareId, describeDevice,
} from '@renderer/composables/useDeviceShare'
import type { DeviceShareMessage } from '@renderer/composables/useDeviceShare'
import type { Device } from 'mira-app-core/shared/sdk'
import { addDeviceTransfer, transferDialogOpen } from './useDeviceTransfers'
import { miraSDKService } from '@renderer/services/MiraSDKService'
import { useLibraryStore } from '@renderer/stores/library'

/** 发送到其他设备：设备列表选择 + 快捷配对 QR + 发送 */
const { t } = useI18n()
const libraryStore = useLibraryStore()
const selectedClientId = ref<string | null>(null)
const devices = ref<Device[]>([])
const sending = ref(false)
const qrDataUrl = ref<string | null>(null)
const pairUrl = ref<string | null>(null)

/** 当前选中设备的展示名（传输记录目标描述用） */
const selectedDeviceLabel = computed(() => {
  const device = devices.value.find(d => d.clientId === selectedClientId.value)
  return device ? describeDevice(device) : ''
})

const files = computed(() => shareFiles.value)
const totalSize = computed(() => files.value.reduce((sum, f) => sum + (f.size || 0), 0))

const formatSize = (n: number) => {
  if (!n) return ''
  if (n > 1048576) return (n / 1048576).toFixed(1) + ' MB'
  if (n > 1024) return (n / 1024).toFixed(1) + ' KB'
  return n + ' B'
}

// 打开时生成配对 QR（token / libraryId / ws 打进 URL，静态页免输入配对）
watch(shareDialogOpen, async (open) => {
  if (!open) {
    selectedClientId.value = null
    return
  }
  qrDataUrl.value = null
  const pair = buildPairUrl()
  pairUrl.value = pair?.pageUrl ?? null
  if (pair) {
    try {
      qrDataUrl.value = await QRCode.toDataURL(pair.pageUrl, { width: 220, margin: 1 })
    } catch (e) {
      console.warn('[device-share] generate QR failed', e)
    }
  }
})

const handleCopyUrl = async () => {
  if (!pairUrl.value) return
  await navigator.clipboard.writeText(pairUrl.value)
  toast.success(t('common.copied'))
}

const handleSend = async () => {
  const client = (miraSDKService as any).client
  if (!client || !selectedClientId.value) return
  const libraryId = libraryStore.currentLibrary?.id || 'default'

  // 先创建一次性分享票据（免 token 下载，多文件自动 ZIP），失败时回退逐文件直链
  let ticketUrl: string | undefined
  try {
    // id 优先（server 权威解析路径），path 兜底
    const ticketFiles = files.value
      .filter(f => f.id || f.path)
      .map(f => ({ id: f.id, path: f.path, name: f.name }))
    if (ticketFiles.length > 0) {
      const ticket = await client.devices().createShareTicket({ libraryId, files: ticketFiles })
      // 票据链接要跨设备可达：用局域网 origin（与配对 QR 一致）而不是 serverUrl 里的 loopback
      const origin = resolveServerOrigin()
      if (ticket?.downloadUrl && origin) ticketUrl = `${origin}${ticket.downloadUrl}`
    }
  } catch (e) {
    console.warn('[device-share] create share ticket failed, fallback to direct urls', e)
  }

  const message: DeviceShareMessage = {
    type: 'mira-share',
    // ack 关联用：接收端回传进度（mira-share-ack）时携带
    id: createShareId(),
    from: getSelfClientId() || 'unknown',
    libraryId,
    files: JSON.parse(JSON.stringify(files.value)),
    ...(ticketUrl ? { ticketUrl } : {}),
  }
  sending.value = true
  try {
    await client.devices().sendMessage(selectedClientId.value, libraryId, message)
    // 登记传输记录（传输对话框展示待接收列表与对端进度）并打开查看
    addDeviceTransfer(message, selectedDeviceLabel.value || selectedClientId.value)
    transferDialogOpen.value = true
    toast.success(t('business.deviceShare.sent'))
    shareDialogOpen.value = false
  } catch (e) {
    console.error('[device-share] send failed', e)
    toast.error(t('business.deviceShare.sendFailed'), {
      description: e instanceof Error ? e.message : String(e),
    })
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <Dialog :open="shareDialogOpen" @update:open="shareDialogOpen = $event">
    <DialogContent class="sm:max-w-[640px]">
      <DialogHeader>
        <DialogTitle>{{ $t('business.deviceShare.title') }}</DialogTitle>
        <DialogDescription>
          {{ $t('business.deviceShare.fileSummary', { count: files.length, size: formatSize(totalSize) || '-' }) }}
        </DialogDescription>
      </DialogHeader>

      <div class="flex gap-4 max-h-[420px]">
        <!-- 左：设备列表 -->
        <div class="flex-1 min-w-0 overflow-y-auto pr-1">
          <DeviceListPicker v-model:selected="selectedClientId" @devices="devices = $event" />
        </div>

        <!-- 右：快捷配对 QR -->
        <div class="w-[240px] flex-none flex flex-col items-center justify-center gap-2 border-l border-border pl-4">
          <template v-if="qrDataUrl">
            <img :src="qrDataUrl" alt="pair qr" class="w-[180px] h-[180px] rounded-lg border border-border" />
            <p class="text-xs text-muted-foreground text-center leading-5">
              {{ $t('business.deviceShare.qrHint') }}
            </p>
            <Button variant="outline" size="xs" @click="handleCopyUrl">
              {{ $t('common.copy') }} URL
            </Button>
          </template>
          <p v-else class="text-xs text-muted-foreground text-center">
            {{ $t('business.deviceShare.qrUnavailable') }}
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="shareDialogOpen = false">{{ $t('common.cancel') }}</Button>
        <Button :disabled="!selectedClientId || sending" @click="handleSend">
          {{ sending ? $t('business.deviceShare.sending') : $t('business.deviceShare.send') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
