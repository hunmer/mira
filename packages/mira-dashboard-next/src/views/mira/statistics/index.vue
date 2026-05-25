<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { libraryApi, statisticsApi } from '@/api'
import type { ChartConfig } from '@/components/ui/chart'
import { VisArea, VisAxis, VisLine, VisXYContainer } from '@unovis/vue'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import {
  ChartContainer, ChartTooltipContent, ChartCrosshair, ChartTooltip, componentToString,
} from '@/components/ui/chart'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type { Library } from '@/types/mira'

const { t } = useI18n()

interface DailyRow { date: string; file_count: number; total_size: number }

const libraries = ref<Library[]>([])
const selectedLibraryId = ref<string>('')
const rawDaily = ref<DailyRow[]>([])
const loading = ref(false)
const timeRange = ref('60d')

async function loadLibraries() {
  try {
    const res: any = await libraryApi.list()
    const d = res.data
    libraries.value = Array.isArray(d) ? d : d?.data || []
  } catch {}
}

async function loadStats() {
  if (!selectedLibraryId.value) return
  loading.value = true
  try {
    const res: any = await statisticsApi.daily(selectedLibraryId.value)
    rawDaily.value = res.data?.data || []
  } catch {
    rawDaily.value = []
  } finally {
    loading.value = false
  }
}

watch(selectedLibraryId, loadStats)
loadLibraries()

type ChartItem = { date: Date; fileCount: number; totalSizeMB: number }

const chartData = computed<ChartItem[]>(() => {
  const days = timeRange.value === '30d' ? 30 : 60
  const now = new Date()
  const startDate = new Date(now)
  startDate.setDate(startDate.getDate() - days)

  const map = new Map<string, DailyRow>()
  for (const r of rawDaily.value) map.set(r.date, r)

  const result: ChartItem[] = []
  for (let i = 0; i <= days; i++) {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    const row = map.get(key)
    result.push({
      date: d,
      fileCount: row?.file_count ?? 0,
      totalSizeMB: Math.round((row?.total_size ?? 0) / 1024 / 1024 * 100) / 100,
    })
  }
  return result
})

const chartConfig = {
  fileCount: { label: t('statistics.fileCount'), color: 'hsl(var(--chart-1))' },
  totalSizeMB: { label: t('statistics.totalSizeMB'), color: 'hsl(var(--chart-2))' },
} satisfies ChartConfig

const svgDefs = `
  <linearGradient id="fillFileCount" x1="0" y1="0" x2="0" y2="1">
    <stop offset="5%" stop-color="var(--color-fileCount)" stop-opacity="0.8" />
    <stop offset="95%" stop-color="var(--color-fileCount)" stop-opacity="0.1" />
  </linearGradient>
  <linearGradient id="fillTotalSizeMB" x1="0" y1="0" x2="0" y2="1">
    <stop offset="5%" stop-color="var(--color-totalSizeMB)" stop-opacity="0.8" />
    <stop offset="95%" stop-color="var(--color-totalSizeMB)" stop-opacity="0.1" />
  </linearGradient>
`

const yMax = computed(() => {
  const maxVal = Math.max(...chartData.value.map(d => Math.max(d.fileCount, d.totalSizeMB)), 10)
  return Math.ceil(maxVal * 1.2)
})

function formatSize(bytes: number) {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i]
}

const summary = computed(() => {
  const totalFiles = rawDaily.value.reduce((s, r) => s + r.file_count, 0)
  const totalSize = rawDaily.value.reduce((s, r) => s + r.total_size, 0)
  return { totalFiles, totalSize }
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">{{ t('statistics.title') }}</h1>
        <p class="text-muted-foreground text-sm">{{ t('statistics.subtitle') }}</p>
      </div>
      <Select v-model="selectedLibraryId">
        <SelectTrigger class="w-[260px]">
          <SelectValue :placeholder="t('statistics.selectLibrary')" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="lib in libraries" :key="lib.id" :value="lib.id">
            {{ lib.name }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <!-- 汇总卡片 -->
    <div v-if="selectedLibraryId && rawDaily.length" class="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader class="pb-2">
          <CardDescription>{{ t('statistics.fileCount') }}</CardDescription>
          <CardTitle class="text-3xl">{{ summary.totalFiles }}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader class="pb-2">
          <CardDescription>{{ t('statistics.totalSize') }}</CardDescription>
          <CardTitle class="text-3xl">{{ formatSize(summary.totalSize) }}</CardTitle>
        </CardHeader>
      </Card>
    </div>

    <!-- 图表 -->
    <Card v-if="selectedLibraryId" class="pt-0">
      <CardHeader class="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div class="grid flex-1 gap-1">
          <CardTitle>{{ t('statistics.trend') }}</CardTitle>
          <CardDescription>{{ t('statistics.trendDesc') }}</CardDescription>
        </div>
        <Select v-model="timeRange">
          <SelectTrigger class="hidden w-[160px] rounded-lg sm:ml-auto sm:flex">
            <SelectValue />
          </SelectTrigger>
          <SelectContent class="rounded-xl">
            <SelectItem value="60d" class="rounded-lg">{{ t('statistics.60d') }}</SelectItem>
            <SelectItem value="30d" class="rounded-lg">{{ t('statistics.30d') }}</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent class="px-2 pt-4 sm:px-6 sm:pt-6 pb-4">
        <div v-if="loading" class="text-muted-foreground py-16 text-center">{{ t('common.loading') }}</div>
        <div v-else-if="!chartData.length" class="text-muted-foreground py-16 text-center">{{ t('common.noData') }}</div>
        <ChartContainer v-else :config="chartConfig" class="aspect-auto h-[300px] w-full" :cursor="false">
          <VisXYContainer :data="chartData" :svg-defs="svgDefs" :margin="{ left: 10 }" :y-domain="[0, yMax]">
            <VisArea
              :x="(d: ChartItem) => d.date"
              :y="[(d: ChartItem) => d.fileCount, (d: ChartItem) => d.totalSizeMB]"
              :color="(_d: ChartItem, i: number) => ['url(#fillFileCount)', 'url(#fillTotalSizeMB)'][i]"
              :opacity="0.6"
            />
            <VisLine
              :x="(d: ChartItem) => d.date"
              :y="[(d: ChartItem) => d.fileCount, (d: ChartItem) => d.totalSizeMB]"
              :color="(_d: ChartItem, i: number) => [chartConfig.fileCount.color, chartConfig.totalSizeMB.color][i]"
              :line-width="1.5"
            />
            <VisAxis
              type="x"
              :x="(d: ChartItem) => d.date"
              :tick-line="false"
              :domain-line="false"
              :grid-line="false"
              :num-ticks="6"
              :tick-format="(ts: number) => {
                const d = new Date(ts)
                return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
              }"
            />
            <VisAxis type="y" :num-ticks="4" :tick-line="false" :domain-line="false" />
            <ChartTooltip />
            <ChartCrosshair
              :template="componentToString(chartConfig, ChartTooltipContent, {
                labelFormatter: (d: any) => new Date(d).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
              })"
              :color="(_d: ChartItem, i: number) => [chartConfig.fileCount.color, chartConfig.totalSizeMB.color][i % 2]"
            />
          </VisXYContainer>
        </ChartContainer>
      </CardContent>
    </Card>

    <Card v-if="!selectedLibraryId">
      <CardContent class="text-muted-foreground py-16 text-center">
        {{ t('statistics.selectLibrary') }}
      </CardContent>
    </Card>
  </div>
</template>
