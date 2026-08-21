<template>
  <div class="flex h-full flex-col">
    <!-- 加载中 -->
    <div v-if="loading" class="flex flex-1 items-center justify-center">
      <span class="material-icons animate-spin text-muted-foreground">refresh</span>
    </div>

    <!-- 错误（可重试） -->
    <div
      v-else-if="error"
      class="flex flex-1 cursor-pointer flex-col items-center justify-center gap-1 px-3 text-center"
      @click="load"
    >
      <span class="material-icons text-xl text-muted-foreground">wifi_off</span>
      <span class="text-xs text-muted-foreground">{{ error }}</span>
      <span class="text-xs text-primary">{{ $t('tabs.statisticsCards.clickRetry') }}</span>
    </div>

    <!-- 无库 / 无数据 -->
    <div v-else-if="!timeline.length" class="flex flex-1 flex-col items-center justify-center gap-1 text-muted-foreground">
      <span class="material-icons text-xl">history</span>
      <span class="text-xs">{{ libraryId ? $t('tabs.statisticsCards.noData') : noLibrary }}</span>
    </div>

    <!-- 时间线 -->
    <div v-else class="min-h-0 flex-1 overflow-y-auto px-3 py-2.5">
      <div class="relative">
        <template v-for="(day, di) in timeline" :key="day.date">
          <div v-for="(item, i) in day.items" :key="di + '-' + i" class="relative flex gap-3 pb-5 last:pb-0">
            <div
              v-if="i < day.items.length - 1 || di < timeline.length - 1"
              class="absolute bottom-0 left-[13.5px] top-8 w-px bg-border"
            />
            <div class="relative z-10 shrink-0">
              <Avatar class="size-7 ring-2 ring-card">
                <AvatarImage v-if="item.uploader" :src="userAvatarUrl(item.uploader) || ''" />
                <AvatarFallback class="text-[10px]">{{ item.userName?.slice(0, 2).toUpperCase() }}</AvatarFallback>
              </Avatar>
            </div>
            <div class="min-w-0 flex-1 pt-0.5">
              <!-- 第一行：用户名 + 时间 -->
              <div class="flex items-baseline justify-between gap-2">
                <span class="truncate text-xs font-medium" :title="item.userName">{{ item.userName }}</span>
                <span class="shrink-0 text-[10px] text-muted-foreground">{{ daysAgo(day.date) }}</span>
              </div>
              <!-- 第二行：数量 + 目标 -->
              <div class="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                <span class="shrink-0 font-medium tabular-nums text-foreground">{{ item.fileCount }}</span>
                <span class="shrink-0">{{ $t('tabs.statisticsCards.filesUnit') }}</span>
                <span class="material-icons shrink-0 text-sm leading-none">chevron_right</span>
                <Badge v-if="item.targetType" variant="secondary" class="h-[18px] shrink-0 px-1.5 text-[10px]">
                  {{ item.targetType }}
                </Badge>
                <span class="truncate font-medium text-foreground" :title="item.target">{{ item.target }}</span>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useStatsCard, stats, userAvatarUrl } from './useStatsCard'
import type { RecentUploadDay } from './useStatsCard'

/**
 * 最近上传记录卡片：谁、上传了多少文件、传到了哪个目录/标签。
 * 数据与 dashboard 统计页一致（statistics/recent-uploads）。
 */
interface Props {
  config?: { days?: number }
}

const props = defineProps<Props>()
const configRef = computed(() => props.config) as Ref<Record<string, any> | undefined>

const { t } = useI18n()
const { loading, error, data, noLibrary, load, libraryId } = useStatsCard<RecentUploadDay[]>(
  configRef,
  (lib, d) => stats().recentUploads(lib, d),
)

/** 卡片空间有限，最多展示最近 20 条事件 */
const timeline = computed(() => {
  const days = data.value ?? []
  const out: RecentUploadDay[] = []
  let remain = 20
  for (const day of days) {
    if (remain <= 0) break
    const items = day.items.slice(0, remain)
    remain -= items.length
    out.push({ date: day.date, items })
  }
  return out
})

function daysAgo(dateStr: string) {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const d = new Date(dateStr + 'T00:00:00')
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diff <= 0) return t('tabs.statisticsCards.today')
  if (diff === 1) return t('tabs.statisticsCards.yesterday')
  return t('tabs.statisticsCards.daysAgo', { days: diff })
}

defineExpose({ refresh: load })
</script>

<style scoped>
.material-icons {
  font-size: 20px;
}
.animate-spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
