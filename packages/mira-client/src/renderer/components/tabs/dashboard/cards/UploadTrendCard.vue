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
    <div v-else-if="!hasChartData" class="flex flex-1 flex-col items-center justify-center gap-1 text-muted-foreground">
      <span class="material-icons text-xl">bar_chart</span>
      <span class="text-xs">{{ libraryId ? $t('tabs.statisticsCards.noData') : noLibrary }}</span>
    </div>

    <!-- 趋势图 -->
    <template v-else>
      <div class="flex items-center gap-2 px-3 pt-2 text-xs text-muted-foreground">
        <span>{{ $t('tabs.statisticsCards.lastDays', { days }) }}</span>
        <span class="ml-auto">{{ $t('tabs.statisticsCards.fileCount') }}: {{ summary.totalFiles }}</span>
        <span>{{ $t('tabs.statisticsCards.totalSize') }}: {{ formatSize(summary.totalSize) }}</span>
      </div>
      <div class="min-h-0 flex-1 px-1 pb-2">
        <ChartContainer :config="trendConfig" class="h-full w-full" :cursor="false">
          <VisXYContainer :data="chartData" :svg-defs="svgDefs" :margin="{ left: 6, top: 6 }" :y-domain="[0, yMax]">
            <VisArea
              :x="(d: TrendItem) => d.date.getTime()"
              :y="[(d: TrendItem) => d.fileCount, (d: TrendItem) => d.totalSizeMB]"
              :color="(_d: TrendItem, i: number) => ['url(#miraCardFillFileCount)', 'url(#miraCardFillTotalSizeMB)'][i]"
              :opacity="0.6"
            />
            <VisLine
              :x="(d: TrendItem) => d.date.getTime()"
              :y="[(d: TrendItem) => d.fileCount, (d: TrendItem) => d.totalSizeMB]"
              :color="(_d: TrendItem, i: number) => [trendConfig.fileCount.color, trendConfig.totalSizeMB.color][i]"
              :line-width="1.5"
            />
            <VisAxis
              type="x"
              :x="(d: TrendItem) => d.date.getTime()"
              :tick-line="false"
              :domain-line="false"
              :grid-line="false"
              :num-ticks="4"
              :tick-format="(ts: number) => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })"
            />
            <VisAxis type="y" :num-ticks="3" :tick-line="false" :domain-line="false" />
            <ChartTooltip />
            <ChartCrosshair
              :template="componentToString(trendConfig, ChartTooltipContent, {
                labelFormatter: (d: any) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
              })"
              :color="(_d: TrendItem, i: number) => [trendConfig.fileCount.color, trendConfig.totalSizeMB.color][i % 2]"
            />
          </VisXYContainer>
        </ChartContainer>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { VisXYContainer, VisArea, VisLine, VisAxis } from '@unovis/vue'
import {
  ChartContainer, ChartTooltipContent, ChartCrosshair, ChartTooltip, componentToString,
} from '@/components/ui/chart'
import type { ChartConfig } from '@/components/ui/chart'
import { useStatsCard, formatSize, stats } from './useStatsCard'
import type { DailyRow } from './useStatsCard'

/**
 * 上传趋势卡片：按日文件数 + 体积(MB) 双序列面积图。
 * 数据与 dashboard 统计页一致（statistics/upload/daily），按天补零后渲染。
 */
interface Props {
  config?: { days?: number }
}

const props = defineProps<Props>()
const configRef = computed(() => props.config) as Ref<Record<string, any> | undefined>

const { t } = useI18n()
const { loading, error, data, days, noLibrary, load, libraryId } = useStatsCard<DailyRow[]>(
  configRef,
  (lib, d) => stats().uploadDaily(lib, d),
)

type TrendItem = { date: Date; fileCount: number; totalSizeMB: number }

const chartData = computed<TrendItem[]>(() => {
  const rows = data.value ?? []
  const total = Math.min(365, Math.max(1, days.value))
  const map = new Map<string, DailyRow>()
  for (const r of rows) map.set(r.date, r)

  const now = new Date()
  const startDate = new Date(now)
  startDate.setDate(startDate.getDate() - total)

  // 先按天补零生成连续序列
  const daily: TrendItem[] = []
  for (let i = 0; i <= total; i++) {
    const d = new Date(startDate)
    d.setDate(startDate.getDate() + i)
    const row = map.get(d.toISOString().slice(0, 10))
    daily.push({
      date: d,
      fileCount: row?.file_count ?? 0,
      totalSizeMB: Math.round(((row?.total_size ?? 0) / 1024 / 1024) * 100) / 100,
    })
  }

  // 长周期按天渲染 x 轴过密，聚合成周（求和，不丢量）；date 取每周第一天
  if (total <= 60) return daily
  const weekly: TrendItem[] = []
  for (let i = 0; i < daily.length; i += 7) {
    const chunk = daily.slice(i, i + 7)
    weekly.push({
      date: chunk[0].date,
      fileCount: chunk.reduce((s, d) => s + d.fileCount, 0),
      totalSizeMB: Math.round(chunk.reduce((s, d) => s + d.totalSizeMB, 0) * 100) / 100,
    })
  }
  return weekly
})

const trendConfig = {
  fileCount: { label: t('tabs.statisticsCards.fileCount'), color: 'var(--chart-1)' },
  totalSizeMB: { label: t('tabs.statisticsCards.totalSizeMB'), color: 'var(--chart-2)' },
} satisfies ChartConfig

const svgDefs = `
  <linearGradient id="miraCardFillFileCount" x1="0" y1="0" x2="0" y2="1">
    <stop offset="5%" stop-color="var(--color-fileCount)" stop-opacity="0.8" />
    <stop offset="95%" stop-color="var(--color-fileCount)" stop-opacity="0.1" />
  </linearGradient>
  <linearGradient id="miraCardFillTotalSizeMB" x1="0" y1="0" x2="0" y2="1">
    <stop offset="5%" stop-color="var(--color-totalSizeMB)" stop-opacity="0.8" />
    <stop offset="95%" stop-color="var(--color-totalSizeMB)" stop-opacity="0.1" />
  </linearGradient>
`

const yMax = computed(() => {
  if (!chartData.value.length) return 10
  const maxVal = Math.max(...chartData.value.map((d) => Math.max(d.fileCount, d.totalSizeMB)))
  return Math.max(Math.ceil(maxVal * 1.2), 10)
})

const hasChartData = computed(() => (data.value ?? []).length > 0)

const summary = computed(() => {
  const rows = data.value ?? []
  return {
    totalFiles: rows.reduce((s, r) => s + r.file_count, 0),
    totalSize: rows.reduce((s, r) => s + r.total_size, 0),
  }
})

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
