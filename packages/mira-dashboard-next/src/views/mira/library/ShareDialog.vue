<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import QRCode from 'qrcode'
import { toast } from 'vue-sonner'
import { RiFileCopyLine, RiExternalLinkLine } from '@remixicon/vue'
import type { Library } from '@/types/mira'
import { getApiBaseURL } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

const props = defineProps<{
  open: boolean
  library: Library | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const { t } = useI18n()
const shareUrl = ref('')
const qrDataUrl = ref('')

// 与 mira-client serverList store 的推导规则保持一致（ws 端口 8018）
function toWebSocketUrl(serverUrl: string): string {
  try {
    const u = new URL(serverUrl)
    u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:'
    u.port = '8018'
    u.pathname = ''
    return u.toString().replace(/\/$/, '')
  } catch {
    return serverUrl.replace(/^http/, 'ws')
  }
}

// 生成 mira://server_import 协议链接（Base64 JSON，见 mira-client ProtocolService）
function buildShareUrl(lib: Library): string {
  const serverUrl = getApiBaseURL().replace(/\/api$/, '')
  const payload = {
    type: 'server_import',
    data: {
      id: lib.id,
      name: lib.name,
      serverUrl,
      websocketUrl: toWebSocketUrl(serverUrl),
    },
  }
  // UTF-8 安全的 base64（库名可能含中文）
  const json = JSON.stringify(payload)
  const base64 = btoa(String.fromCharCode(...new TextEncoder().encode(json)))
  return `mira://?json=${base64}`
}

watch(() => props.open, async (open) => {
  if (!open || !props.library) return
  shareUrl.value = buildShareUrl(props.library)
  qrDataUrl.value = await QRCode.toDataURL(shareUrl.value, { width: 176, margin: 1 })
})

async function copyUrl() {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    toast.success(t('common.success'))
  } catch {
    toast.error(t('common.failed'))
  }
}

function openApp() {
  window.location.href = shareUrl.value
}
</script>

<template>
  <Dialog :open="props.open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ t('library.shareTitle') }}</DialogTitle>
        <DialogDescription>{{ t('library.shareHint') }}</DialogDescription>
      </DialogHeader>
      <div class="flex flex-col items-center gap-4">
        <div v-if="qrDataUrl" class="rounded-md border p-2">
          <img :src="qrDataUrl" :alt="t('library.shareTitle')" class="size-44" />
        </div>
        <div class="flex w-full gap-2">
          <Input :model-value="shareUrl" readonly class="font-mono text-xs" @focus="($event.target as HTMLInputElement).select()" />
          <Button variant="outline" size="icon" @click="copyUrl">
            <RiFileCopyLine class="size-4" />
          </Button>
        </div>
      </div>
      <DialogFooter>
        <Button @click="openApp">
          <RiExternalLinkLine class="mr-2 size-4" /> {{ t('library.openApp') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
