<script setup lang="ts">
import { ArrowLeftRight } from '@lucide/vue'
import type { Capabilities } from '@/types'

defineProps<{
  capabilities: Capabilities | null
  fileCount: number
}>()

function shortVersion(version: string): string {
  // 只取第一段里的版本号（如 "ffmpeg version 6.1.1-full_build ..." → "6.1.1"）
  const m = /(\d+(\.\d+)+)/.exec(version || '')
  return m ? m[1] : ''
}
</script>

<template>
  <header class="flex items-center gap-3 border-b bg-card px-4 py-3">
    <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
      <ArrowLeftRight class="size-4" />
    </div>
    <div class="min-w-0 flex-1">
      <h1 class="truncate text-sm font-semibold leading-tight">格式转换</h1>
      <p class="truncate text-xs text-muted-foreground">
        批量转换图片 / 视频 / 音频格式，转换结果作为新文件保存回素材库
      </p>
    </div>
    <div v-if="capabilities" class="flex shrink-0 items-center gap-2 text-xs">
      <span
        class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5"
        :class="capabilities.ffmpeg.available
          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'border-destructive/40 bg-destructive/10 text-destructive'"
        :title="capabilities.ffmpeg.available ? capabilities.ffmpeg.version : '服务器未安装 FFmpeg（视频/音频转换不可用）'"
      >
        FFmpeg {{ capabilities.ffmpeg.available ? shortVersion(capabilities.ffmpeg.version) || '✓' : '✗' }}
      </span>
      <span
        class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5"
        :class="capabilities.imagemagick.available
          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'border-destructive/40 bg-destructive/10 text-destructive'"
        :title="capabilities.imagemagick.available ? capabilities.imagemagick.version : '服务器未安装 ImageMagick（图片转换不可用）'"
      >
        ImageMagick {{ capabilities.imagemagick.available ? shortVersion(capabilities.imagemagick.version) || '✓' : '✗' }}
      </span>
    </div>
  </header>
</template>
