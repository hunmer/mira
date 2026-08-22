<template>
  <div class="h-full overflow-auto text-xs">
    <div v-if="!items.length" class="text-muted-foreground">请选择文件</div>
    <div v-else class="grid grid-cols-1 gap-3">
    <section v-for="file in items" :key="file.id" class="overflow-hidden rounded-lg border border-border/60 bg-background/60 shadow-sm">
      <div class="flex items-center gap-3 border-b border-border/50 bg-muted/20 p-2">
        <div class="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted/50">
          <img v-if="file.thumbnailPath && !thumbnailErrors[file.id]" :src="file.thumbnailPath" :alt="file.name" class="h-full w-full object-cover" @error="thumbnailErrors[file.id] = true" />
          <img v-else-if="!thumbnailErrors[file.id]" :src="getExtIconUrl(file.name)" :alt="file.name" class="h-8 w-8 object-contain opacity-70" />
          <span v-if="thumbnailErrors[file.id]" class="material-icons text-2xl text-muted-foreground">insert_drive_file</span>
        </div>
        <div class="min-w-0">
          <div class="truncate font-medium" :title="file.name">{{ file.name }}</div>
          <div class="text-muted-foreground">{{ file.extension?.toUpperCase() || 'FILE' }}</div>
        </div>
      </div>
      <div v-if="loading[file.id]" class="p-2 text-muted-foreground">解析中...</div>
      <div v-else-if="errors[file.id]" class="p-2 text-destructive">{{ errors[file.id] }}</div>
      <dl v-else-if="rows(tags[file.id]).length" class="divide-y divide-border/50 rounded bg-muted/40">
        <div v-for="row in rows(tags[file.id])" :key="row.key" class="grid grid-cols-[minmax(92px,auto)_1fr] gap-3 px-2 py-1.5">
          <dt class="text-muted-foreground">{{ row.label }}</dt>
          <dd class="break-all">{{ row.value }}</dd>
        </div>
      </dl>
      <div v-else class="p-2 text-muted-foreground">无可展示的 EXIF 信息</div>
    </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { FileInfo } from '../../../shared/types'
import { miraSDKService } from '@renderer/services/MiraSDKService'
import { getExtIconUrl } from '@renderer/utils/extIconHelper'

const props = defineProps<{ items: FileInfo[]; libraryId: string }>()
const tags = reactive<Record<string, Record<string, any>>>({})
const errors = reactive<Record<string, string>>({})
const loading = reactive<Record<string, boolean>>({})
const thumbnailErrors = reactive<Record<string, boolean>>({})

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
const FIELD_LABELS: Array<[string, string]> = [
  ['FileName', '文件名'], ['FileType', '文件类型'], ['MIMEType', 'MIME 类型'],
  ['ImageWidth', '宽度'], ['ImageHeight', '高度'], ['Duration', '时长'],
  ['Make', '制造商'], ['Model', '型号'], ['LensModel', '镜头'],
  ['DateTimeOriginal', '拍摄时间'], ['CreateDate', '创建时间'],
  ['ExposureTime', '曝光时间'], ['FNumber', '光圈'], ['ISO', 'ISO'],
  ['FocalLength', '焦距'], ['WhiteBalance', '白平衡'], ['ColorSpace', '色彩空间'],
  ['Orientation', '方向'], ['Software', '软件'], ['BitDepth', '位深'],
  ['Compression', '压缩方式'], ['VideoFrameRate', '帧率'], ['VideoCodec', '视频编码'],
  ['Rotation', '旋转角度'], ['AudioBitRate', '音频码率'], ['AudioSampleRate', '采样率'],
  ['NumChannels', '声道数'], ['GPSPosition', 'GPS 位置'], ['GPSLatitude', 'GPS 纬度'],
  ['GPSLongitude', 'GPS 经度'],
]

const rows = (value?: Record<string, any>) => FIELD_LABELS
  .map(([key, label]) => ({ key, label, value: value?.[key] }))
  .filter(row => row.value !== undefined && row.value !== null && row.value !== '')
  .map(row => ({ ...row, value: Array.isArray(row.value) ? row.value.join(', ') : String(row.value) }))
</script>
