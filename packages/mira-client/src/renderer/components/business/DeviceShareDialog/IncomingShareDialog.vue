<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { appService } from '@renderer/services'
import { incomingShare } from '@renderer/composables/useDeviceShare'
import { useSettingsStore } from '@renderer/stores/settings'
import { downloadShareFiles } from './downloadShare'

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
const percent = ref(0)

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
  percent.value = 0
  try {
    const saved = await downloadShareFiles(message, {
      saveDir: saveDir.value || undefined,
      onProgress: (p) => { percent.value = p },
    })
    toast.success(t('business.deviceShare.downloadDone', { count: saved.length }), {
      description: appService.isElectron && saveDir.value ? saved[0] : undefined,
    })
    incomingShare.value = null
  } catch (e) {
    console.error('[device-share] download failed', e)
    toast.error(t('business.deviceShare.downloadFailed'), {
      description: e instanceof Error ? e.message : String(e),
    })
  } finally {
    downloading.value = false
  }
}

const handleDecline = () => { incomingShare.value = null }
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
        <div
          v-for="file in files"
          :key="file.id"
          class="flex items-center gap-3 p-2.5 rounded-lg border border-border"
        >
          <span class="material-icons text-primary text-xl">description</span>
          <div class="flex-1 min-w-0">
            <div class="text-sm truncate" :title="file.name">{{ file.name }}</div>
            <div class="text-xs text-muted-foreground">{{ formatSize(file.size) }}</div>
          </div>
        </div>
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
        <Button variant="outline" :disabled="downloading" @click="handleDecline">
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
