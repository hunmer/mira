<script setup lang="ts">
import { computed } from 'vue'
import { Loader2, Play } from '@lucide/vue'
import { Button } from 'mira-plugin-ui/src/components/ui/button'
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from 'mira-plugin-ui/src/components/ui/select'
import { SCALE_OPTIONS, allowedTargets, classifyFile, type Capabilities, type MediaInput, type ScaleKey } from '@/types'
import { useI18n, type I18nKey } from '@/lib/i18n'

const { t } = useI18n()

const props = defineProps<{
  files: MediaInput[]
  capabilities: Capabilities | null
  target: string
  quality: 'high' | 'medium' | 'low'
  scale: ScaleKey
  inheritMeta: boolean
  running: boolean
  error: string
}>()

const emit = defineEmits<{
  (e: 'update:target', v: string): void
  (e: 'update:quality', v: 'high' | 'medium' | 'low'): void
  (e: 'update:scale', v: ScaleKey): void
  (e: 'update:inheritMeta', v: boolean): void
  (e: 'start'): void
}>()

/** 选中文件允许的目标格式交集；无选中时展示全部（供浏览） */
const availableTargets = computed(() => {
  if (props.files.length === 0) return props.capabilities?.targets ?? { image: [], video: [], audio: [] }
  const lists = props.files.map((f) => new Set(allowedTargets(classifyFile(f.name))))
  const first = lists[0]
  const targets = props.capabilities?.targets ?? { image: [], video: [], audio: [] }
  const keep = (list: string[]) => list.filter((t) => lists.every((s) => s.has(t)))
  return {
    image: keep(targets.image),
    video: keep(targets.video),
    audio: keep(targets.audio),
  }
})

const hasAnyTarget = computed(() =>
  availableTargets.value.image.length + availableTargets.value.video.length + availableTargets.value.audio.length > 0)

/** 图片转换需要 imagemagick；视频/音频/gif-from-video 需要 ffmpeg（目标列表按类别混合，两者都校验过才能开始？取宽松策略：只在全部缺失时禁用） */
const binaryMissing = computed(() => {
  if (!props.capabilities) return true
  return !props.capabilities.ffmpeg.available && !props.capabilities.imagemagick.available
})

const canStart = computed(() =>
  !props.running && props.files.length > 0 && Boolean(props.target) && hasAnyTarget.value && !binaryMissing.value)

const targetGroups = computed(() => [
  { key: 'image', label: t('app.groupImage'), formats: availableTargets.value.image },
  { key: 'video', label: t('app.groupVideo'), formats: availableTargets.value.video },
  { key: 'audio', label: t('app.groupAudio'), formats: availableTargets.value.audio },
].filter((g) => g.formats.length > 0))
</script>

<template>
  <div class="rounded-lg border bg-card">
    <div class="border-b px-3 py-2 text-xs font-medium">{{ t('app.settings') }}</div>
    <div class="space-y-4 p-3">
      <!-- 目标格式 -->
      <div class="space-y-1.5">
        <label class="text-xs font-medium text-muted-foreground">{{ t('app.target') }}</label>
        <Select :model-value="target" :disabled="running" @update:model-value="emit('update:target', $event)">
          <SelectTrigger class="h-8 text-xs">
            <SelectValue :placeholder="t('app.targetPlaceholder')" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup v-for="group in targetGroups" :key="group.key">
              <SelectLabel class="text-xs">{{ group.label }}</SelectLabel>
              <SelectItem v-for="fmt in group.formats" :key="fmt" :value="fmt" class="text-xs">
                {{ fmt.toUpperCase() }}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <p v-if="files.length > 0 && !hasAnyTarget" class="text-[11px] text-destructive">
          {{ t('app.noCommonTarget') }}
        </p>
      </div>

      <!-- 质量 -->
      <div class="space-y-1.5">
        <label class="text-xs font-medium text-muted-foreground">{{ t('app.quality') }}</label>
        <Select :model-value="quality" :disabled="running" @update:model-value="emit('update:quality', $event)">
          <SelectTrigger class="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="high" class="text-xs">{{ t('app.qualityHigh') }}</SelectItem>
            <SelectItem value="medium" class="text-xs">{{ t('app.qualityMedium') }}</SelectItem>
            <SelectItem value="low" class="text-xs">{{ t('app.qualityLow') }}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <!-- 分辨率 -->
      <div class="space-y-1.5">
        <label class="text-xs font-medium text-muted-foreground">{{ t('app.scale') }}</label>
        <Select :model-value="scale" :disabled="running" @update:model-value="emit('update:scale', $event)">
          <SelectTrigger class="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="opt in SCALE_OPTIONS" :key="opt.key" :value="opt.key" class="text-xs">
              {{ t(opt.label as I18nKey) }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <!-- 继承元数据 -->
      <label class="flex cursor-pointer items-center gap-2 text-xs">
        <input
          type="checkbox"
          class="size-3.5 accent-[var(--primary)]"
          :checked="inheritMeta"
          :disabled="running"
          @change="emit('update:inheritMeta', ($event.target as HTMLInputElement).checked)"
        />
        {{ t('app.inheritMeta') }}
      </label>

      <Button class="w-full" size="sm" :disabled="!canStart" @click="emit('start')">
        <Loader2 v-if="running" class="size-4 animate-spin" />
        <Play v-else class="size-4" />
        {{ running ? t('app.converting') : files.length > 0 ? t('app.startCount', { n: files.length }) : t('app.start') }}
      </Button>

      <p v-if="error" class="text-[11px] text-destructive">{{ error }}</p>
      <p v-else-if="binaryMissing && capabilities" class="text-[11px] text-destructive">
        {{ t('app.binaryMissing') }}
      </p>
    </div>
  </div>
</template>
