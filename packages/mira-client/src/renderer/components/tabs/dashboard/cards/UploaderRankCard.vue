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
    <div v-else-if="!rankData.length" class="flex flex-1 flex-col items-center justify-center gap-1 text-muted-foreground">
      <span class="material-icons text-xl">leaderboard</span>
      <span class="text-xs">{{ libraryId ? $t('tabs.statisticsCards.noData') : noLibrary }}</span>
    </div>

    <!-- 排行榜 -->
    <div v-else class="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
      <div v-for="u in rankData" :key="u.index" class="flex items-center gap-2">
        <div class="flex w-20 shrink-0 items-center gap-1.5">
          <Avatar class="size-5">
            <AvatarImage v-if="u.uploaderId" :src="userAvatarUrl(u.uploaderId) || ''" />
            <AvatarFallback class="text-[9px]">{{ u.name?.slice(0, 1).toUpperCase() }}</AvatarFallback>
          </Avatar>
          <span class="truncate text-xs" :title="u.name">{{ u.name }}</span>
        </div>
        <div class="flex min-w-0 flex-1 items-center gap-2">
          <div class="h-4 min-w-0 flex-1 overflow-hidden rounded bg-muted">
            <div
              class="h-full rounded transition-all duration-500"
              :style="{ width: maxCount ? (u.count / maxCount) * 100 + '%' : '0%', backgroundColor: u.fill }"
            />
          </div>
          <span class="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground" :title="formatSize(u.totalSize)">
            {{ u.count }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Ref } from 'vue'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useStatsCard, nameToColor, formatSize, stats, userAvatarUrl } from './useStatsCard'
import type { UploaderRow } from './useStatsCard'

/**
 * 上传人员排行卡片：按上传文件数排序的横向条形榜。
 * 数据与 dashboard 统计页一致（statistics/upload）。
 */
interface Props {
  config?: { days?: number }
}

const props = defineProps<Props>()
const configRef = computed(() => props.config) as Ref<Record<string, any> | undefined>

const { loading, error, data, noLibrary, load, libraryId } = useStatsCard<UploaderRow[]>(
  configRef,
  (lib, d) => stats().upload(lib, d),
)

const rankData = computed(() =>
  [...(data.value ?? [])]
    .sort((a, b) => b.fileCount - a.fileCount)
    .map((u, i) => ({
      index: i,
      name: u.uploaderName,
      uploaderId: u.uploader,
      count: u.fileCount,
      totalSize: u.totalSize,
      fill: nameToColor(u.uploaderName || String(i)),
    })),
)

const maxCount = computed(() =>
  rankData.value.length ? Math.max(...rankData.value.map((d) => d.count)) : 0,
)

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
