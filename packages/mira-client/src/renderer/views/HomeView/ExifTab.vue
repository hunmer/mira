<template>
  <div class="h-full overflow-auto text-xs">
    <div v-if="!items.length" class="text-muted-foreground">请选择文件</div>
    <div v-for="file in items" :key="file.id" class="mb-3">
      <div class="font-medium mb-1 truncate">{{ file.name }}</div>
      <div v-if="loading[file.id]" class="text-muted-foreground">解析中...</div>
      <div v-else-if="errors[file.id]" class="text-destructive">{{ errors[file.id] }}</div>
      <pre v-else class="whitespace-pre-wrap break-all rounded bg-muted/40 p-2">{{ format(tags[file.id]) }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { FileInfo } from '../../../shared/types'
import { miraSDKService } from '@renderer/services/MiraSDKService'

const props = defineProps<{ items: FileInfo[]; libraryId: string }>()
const tags = reactive<Record<string, Record<string, any>>>({})
const errors = reactive<Record<string, string>>({})
const loading = reactive<Record<string, boolean>>({})

async function load() {
  const files = props.items
  Object.keys(tags).forEach(id => { if (!files.some(file => file.id === id)) delete tags[id] })
  if (!files.length) return
  files.forEach(file => { loading[file.id] = true; delete errors[file.id] })
  try {
    const result = await miraSDKService.getFileExifByIds(props.libraryId, files.map(file => file.id))
    result.forEach(entry => {
      if (entry.tags) tags[entry.id] = entry.tags
      if (entry.error) errors[entry.id] = entry.error
    })
  } catch (error) {
    files.forEach(file => { errors[file.id] = error instanceof Error ? error.message : String(error) })
  } finally {
    files.forEach(file => { loading[file.id] = false })
  }
}
watch(() => [props.libraryId, props.items.map(file => file.id).join(',')], load, { immediate: true })
const format = (value: unknown) => value ? JSON.stringify(value, null, 2) : '无 EXIF 数据'
</script>
