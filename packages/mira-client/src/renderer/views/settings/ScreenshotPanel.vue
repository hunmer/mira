<template>
  <div class="p-4 space-y-5">
    <div><h3 class="text-base font-semibold">截图</h3><p class="text-xs text-muted-foreground mt-1">配置快捷键截图完成后的处理方式。</p></div>
    <div class="flex items-center justify-between gap-4">
      <div><p class="text-sm font-medium">默认保存格式</p><p class="text-xs text-muted-foreground">截图保存到系统图片目录时使用的格式。</p></div>
      <Select :model-value="settingsStore.settings.screenshotFormat" @update:model-value="update('screenshotFormat', $event as 'png' | 'jpeg' | 'webp')">
        <SelectTrigger class="w-28"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="png">PNG</SelectItem><SelectItem value="jpeg">JPEG</SelectItem><SelectItem value="webp">WebP</SelectItem></SelectContent>
      </Select>
    </div>
    <div v-for="item in toggles" :key="item.key" class="flex items-center justify-between gap-4 py-2">
      <div><p class="text-sm font-medium">{{ item.label }}</p><p class="text-xs text-muted-foreground">{{ item.desc }}</p></div>
      <Switch :model-value="settingsStore.settings[item.key]" @update:model-value="update(item.key, $event)" />
    </div>
  </div>
</template>
<script setup lang="ts">
import { useSettingsStore, type AppSettings } from '../../stores/settings'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
const settingsStore = useSettingsStore()
const toggles = [
  { key: 'screenshotCopyToClipboard' as const, label: '完成截图后写入剪切板', desc: '方便直接粘贴到聊天或文档。' },
  { key: 'screenshotAutoImport' as const, label: '完成截图后自动导入', desc: '截图完成后加入当前素材库。' },
  { key: 'screenshotOpenUploadDialog' as const, label: '自动导入时打开文件上传对话框', desc: '自动导入时显示上传队列，便于补充标签和文件夹。' },
]
async function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) { await settingsStore.updateSetting(key, value) }
</script>
