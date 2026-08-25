<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import QRCode from 'qrcode'
import { toast } from 'vue-sonner'
import type { Device } from 'mira-app-core/shared/sdk'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import {
  Attachment, AttachmentContent, AttachmentDescription, AttachmentMedia, AttachmentTitle,
} from '@/components/ui/attachment'
import DeviceListPicker from './DeviceListPicker.vue'
import {
  shareDialogOpen, shareFiles, getSelfClientId, buildPairUrl, resolveServerOrigin, createShareId, describeDevice,
} from '@renderer/composables/useDeviceShare'
import type { DeviceShareMessage } from '@renderer/composables/useDeviceShare'
import {
  addDeviceTransfer, deviceTransfers, shareDialogTab, clearFinishedTransfers, activeTransferCount, resetTransferForResend,
  type DeviceTransferItem,
} from './useDeviceTransfers'
import { miraSDKService } from '@renderer/services/MiraSDKService'
import { useLibraryStore } from '@renderer/stores/library'

/**
 * 发送到其他设备（双页签）：
 * - send：设备列表选择 + 快捷配对 QR + 发送
 * - transfers：已发送的待接收列表与对端回传的接收进度（状态全局保存，重开恢复）
 */
const { t } = useI18n()
const libraryStore = useLibraryStore()
const selectedClientId = ref<string | null>(null)
const devices = ref<Device[]>([])
const sending = ref(false)
const qrDataUrl = ref<string | null>(null)
const pairUrl = ref<string | null>(null)

const files = computed(() => shareFiles.value)
const totalSize = computed(() => files.value.reduce((sum, f) => sum + (f.size || 0), 0))
const activeCount = computed(() => activeTransferCount())

/** 当前选中设备的展示名（传输记录目标描述用） */
const selectedDeviceLabel = computed(() => {
  const device = devices.value.find(d => d.clientId === selectedClientId.value)
  return device ? describeDevice(device) : ''
})

const formatSize = (n?: number) => {
  if (!n) return ''
  if (n > 1048576) return (n / 1048576).toFixed(1) + ' MB'
  if (n > 1024) return (n / 1024).toFixed(1) + ' KB'
  return n + ' B'
}

/* ---------- send 页签：配对 QR ---------- */
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

/** 创建一次性分享票据（免 token 下载，多文件自动 ZIP）；失败返回 undefined 回退逐文件直链 */
const createTicketUrl = async (files: DeviceShareMessage['files'], libraryId: string): Promise<string | undefined> => {
  try {
    // id 优先（server 权威解析路径），path 兜底
    const ticketFiles = files
      .filter(f => f.id || f.path)
      .map(f => ({ id: f.id, path: f.path, name: f.name }))
    if (ticketFiles.length === 0) return undefined
    const client = (miraSDKService as any).client
    const ticket = await client.devices().createShareTicket({ libraryId, files: ticketFiles })
    // 票据链接要跨设备可达：用局域网 origin（与配对 QR 一致）而不是 serverUrl 里的 loopback
    const origin = resolveServerOrigin()
    return ticket?.downloadUrl && origin ? `${origin}${ticket.downloadUrl}` : undefined
  } catch (e) {
    console.warn('[device-share] create share ticket failed, fallback to direct urls', e)
    return undefined
  }
}

const handleSend = async () => {
  const client = (miraSDKService as any).client
  if (!client || !selectedClientId.value) return
  const libraryId = libraryStore.currentLibrary?.id || 'default'

  const ticketUrl = await createTicketUrl(files.value, libraryId)

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
    // 登记传输记录并切到传输页签查看对端接收进度
    addDeviceTransfer(message, selectedClientId.value, selectedDeviceLabel.value)
    shareDialogTab.value = 'transfers'
    toast.success(t('business.deviceShare.sent'))
  } catch (e) {
    console.error('[device-share] send failed', e)
    toast.error(t('business.deviceShare.sendFailed'), {
      description: e instanceof Error ? e.message : String(e),
    })
  } finally {
    sending.value = false
  }
}

/** 重新发送一条传输记录：重新生成票据与 shareId，发给原目标设备后重置为待接收态 */
const resendingId = ref<string | null>(null)
const handleResend = async (item: DeviceTransferItem) => {
  const client = (miraSDKService as any).client
  if (!client || !item.targetClientId || resendingId.value) return
  const libraryId = libraryStore.currentLibrary?.id || 'default'

  resendingId.value = item.id
  try {
    const ticketUrl = await createTicketUrl(item.files, libraryId)
    const message: DeviceShareMessage = {
      type: 'mira-share',
      id: createShareId(),
      from: getSelfClientId() || 'unknown',
      libraryId,
      files: item.files,
      ...(ticketUrl ? { ticketUrl } : {}),
    }
    await client.devices().sendMessage(item.targetClientId, libraryId, message)
    resetTransferForResend(item, message)
    toast.success(t('business.deviceShare.sent'))
  } catch (e) {
    console.error('[device-share] resend failed', e)
    toast.error(t('business.deviceShare.sendFailed'), {
      description: e instanceof Error ? e.message : String(e),
    })
  } finally {
    resendingId.value = null
  }
}

/* ---------- transfers 页签：待接收列表与对端进度 ---------- */
const hasFinished = computed(() =>
  deviceTransfers.value.some(item => item.state !== 'sent' && item.state !== 'receiving'))

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

/** 记录级状态图标 */
const stateIcon = (item: DeviceTransferItem) => ({
  sent: 'schedule',
  receiving: 'cloud_download',
  done: 'check_circle',
  failed: 'error',
  declined: 'block',
} as const)[item.state]

const stateIconClass = (item: DeviceTransferItem) => ({
  sent: 'text-muted-foreground',
  receiving: 'text-primary animate-pulse',
  done: 'text-green-500',
  failed: 'text-destructive',
  declined: 'text-destructive',
} as const)[item.state]

/** 多文件记录的展开状态（默认收起，替换式 Set 保证响应） */
const expandedTransfers = ref(new Set<string>())
const isExpanded = (id: string) => expandedTransfers.value.has(id)
const setExpanded = (id: string, open: boolean) => {
  const next = new Set(expandedTransfers.value)
  open ? next.add(id) : next.delete(id)
  expandedTransfers.value = next
}

const transferTotalSize = (item: DeviceTransferItem) =>
  item.files.reduce((sum, f) => sum + (f.size || 0), 0)

const timeAgo = (ts: number) => {
  const elapsed = Math.max(0, Date.now() - ts)
  if (elapsed < 60000) return t('business.deviceShare.justNow')
  return t('business.deviceShare.minutesAgo', { n: Math.floor(elapsed / 60000) })
}

const dialogDescription = computed(() => shareDialogTab.value === 'send'
  ? t('business.deviceShare.fileSummary', { count: files.value.length, size: formatSize(totalSize.value) || '-' })
  : t('business.deviceShare.transferDesc'))
</script>

<template>
  <Dialog :open="shareDialogOpen" @update:open="shareDialogOpen = $event">
    <DialogContent class="sm:max-w-[80vw] w-full">
      <DialogHeader>
        <DialogTitle>{{ $t('business.deviceShare.title') }}</DialogTitle>
        <DialogDescription>{{ dialogDescription }}</DialogDescription>
      </DialogHeader>

      <Tabs :model-value="shareDialogTab" class="flex w-full min-w-0 flex-col gap-4" @update:model-value="shareDialogTab = $event as 'send' | 'transfers'">
        <TabsList class="self-start">
          <TabsTrigger value="send">{{ $t('business.deviceShare.tabSend') }}</TabsTrigger>
          <TabsTrigger value="transfers" class="gap-1.5">
            {{ $t('business.deviceShare.tabTransfers') }}
            <span v-if="activeCount > 0"
              class="min-w-3.5 h-3.5 px-0.5 rounded-full bg-primary text-primary-foreground text-[9px] leading-none flex items-center justify-center">
              {{ activeCount }}
            </span>
          </TabsTrigger>
        </TabsList>

        <!-- 发送：设备列表 + 快捷配对 QR -->
        <TabsContent value="send" class="mt-0">
          <div class="flex flex-col gap-4">
            <div class="flex gap-4 max-h-[420px]">
              <div class="flex-1 min-w-0 overflow-y-auto pr-1">
                <DeviceListPicker v-model:selected="selectedClientId" @devices="devices = $event" />
              </div>

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
          </div>
        </TabsContent>

        <!-- 设备传输：记录头 + Collapsible 折叠的逐文件列表 -->
        <TabsContent value="transfers" class="mt-0 w-full min-w-0">
          <div class="flex flex-col gap-4">
            <div class="max-h-[420px] min-w-0 overflow-y-auto flex flex-col gap-2">
              <p v-if="deviceTransfers.length === 0" class="text-sm text-muted-foreground text-center py-10">
                {{ $t('business.deviceShare.transferEmpty') }}
              </p>

              <div
                v-for="item in deviceTransfers"
                :key="item.id"
                class="flex flex-col gap-2 rounded-xl border bg-card p-3 min-w-0"
                :class="item.state === 'failed' || item.state === 'declined' ? 'border-destructive/30' : 'border-border'"
              >
                <!-- 记录头：目标设备 + 状态 + 相对时间 -->
                <div class="flex items-center gap-2 min-w-0 text-sm">
                  <span class="material-icons text-base flex-none" :class="stateIconClass(item)">{{ stateIcon(item) }}</span>
                  <div class="flex-1 min-w-0">
                    <div class="truncate font-medium" :title="item.targetLabel">{{ item.targetLabel }}</div>
                    <div class="text-xs text-muted-foreground truncate">{{ stateText(item) }} · {{ timeAgo(item.updatedAt) }}</div>
                  </div>
                </div>
                <Progress v-if="item.state === 'receiving'" :model-value="Math.round(item.percent * 100)" class="h-1.5" />

                <!-- 单文件：直接展示 -->
                <Attachment v-if="item.files.length === 1" :state="attachState(item)" class="w-full">
                  <AttachmentMedia variant="icon">
                    <span class="material-icons">{{ fileIcon(item.files[0]?.name) }}</span>
                  </AttachmentMedia>
                  <AttachmentContent>
                    <AttachmentTitle :title="item.files[0]?.name">{{ item.files[0]?.name }}</AttachmentTitle>
                    <AttachmentDescription>{{ formatSize(item.files[0]?.size) }}</AttachmentDescription>
                  </AttachmentContent>
                </Attachment>

                <!-- 多文件：折叠展开逐个 Attachment；右侧提供重新发送 -->
                <Collapsible v-else :open="isExpanded(item.id)" class="min-w-0" @update:open="setExpanded(item.id, $event)">
                  <div class="flex items-center gap-1">
                    <CollapsibleTrigger as-child>
                      <button type="button"
                        class="flex flex-1 min-w-0 items-center gap-1 rounded-md px-1 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                        <span class="material-icons text-sm flex-none transition-transform" :class="isExpanded(item.id) && 'rotate-90'">chevron_right</span>
                        <span class="truncate">
                          {{ $t('business.deviceShare.transferFilesCount', { count: item.files.length }) }} · {{ formatSize(transferTotalSize(item)) }}
                        </span>
                      </button>
                    </CollapsibleTrigger>
                    <button type="button"
                      class="flex-none flex items-center justify-center size-6 rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                      :disabled="resendingId === item.id"
                      :title="$t('business.deviceShare.transferResend')"
                      @click="handleResend(item)">
                      <span class="material-icons text-sm" :class="resendingId === item.id && 'animate-spin'">refresh</span>
                    </button>
                  </div>
                  <CollapsibleContent>
                    <div class="flex flex-col gap-2 mt-1 min-w-0">
                      <Attachment v-for="file in item.files" :key="file.id" :state="attachState(item)" class="w-full">
                        <AttachmentMedia variant="icon">
                          <span class="material-icons">{{ fileIcon(file.name) }}</span>
                        </AttachmentMedia>
                        <AttachmentContent>
                          <AttachmentTitle :title="file.name">{{ file.name }}</AttachmentTitle>
                          <AttachmentDescription>{{ formatSize(file.size) }}</AttachmentDescription>
                        </AttachmentContent>
                      </Attachment>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" :disabled="!hasFinished" @click="clearFinishedTransfers">
                {{ $t('business.deviceShare.transferClear') }}
              </Button>
            </DialogFooter>
          </div>
        </TabsContent>
      </Tabs>
    </DialogContent>
  </Dialog>
</template>
