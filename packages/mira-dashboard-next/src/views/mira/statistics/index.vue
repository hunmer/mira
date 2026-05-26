<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { libraryApi, statisticsApi } from '@/api'
import type { ChartConfig } from '@/components/ui/chart'
import { Orientation } from '@unovis/ts'
import { Donut } from '@unovis/ts'
import { VisArea, VisAxis, VisLine, VisXYContainer, VisGroupedBar, VisDonut, VisSingleContainer } from '@unovis/vue'
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
const route = useRoute()

interface DailyRow { date: string; file_count: number; total_size: number }
interface UploaderRow { uploader: number | null; uploaderName: string; fileCount: number; totalSize: number }
interface FileTypeRow { type: string; file_count: number; total_size: number }

const libraries = ref<Library[]>([])
const selectedLibraryId = ref<string>('')
const rawDaily = ref<DailyRow[]>([])
const uploaders = ref<UploaderRow[]>([])
const fileTypes = ref<FileTypeRow[]>([])
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
    const [dailyRes, uploadRes, typeRes]: any[] = await Promise.all([
      statisticsApi.daily(selectedLibraryId.value),
      statisticsApi.upload(selectedLibraryId.value),
      statisticsApi.fileTypes(selectedLibraryId.value),
    ])
    rawDaily.value = dailyRes.data?.data || []
    uploaders.value = uploadRes.data?.data || []
    fileTypes.value = typeRes.data?.data || []
  } catch {
    rawDaily.value = []
    uploaders.value = []
    fileTypes.value = []
  } finally {
    loading.value = false
  }
}

watch(selectedLibraryId, loadStats)

async function init() {
  await loadLibraries()
  const queryId = route.query.libraryId as string | undefined
  if (queryId && libraries.value.some(l => l.id === queryId)) {
    selectedLibraryId.value = queryId
  }
}
init()

// ---- 趋势图 ----
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

const trendConfig = {
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
  if (!chartData.value.length) return 10
  const maxVal = Math.max(...chartData.value.map(d => Math.max(d.fileCount, d.totalSizeMB)))
  return Math.max(Math.ceil(maxVal * 1.2), 10)
})

const hasChartData = computed(() => chartData.value.some(d => d.fileCount > 0 || d.totalSizeMB > 0))

// ---- 上传人员排行 ----
type UploaderItem = { index: number; name: string; count: number }

const uploaderData = computed<UploaderItem[]>(() =>
  [...uploaders.value]
    .sort((a, b) => b.fileCount - a.fileCount)
    .map((u, i) => ({ index: i, name: u.uploaderName, count: u.fileCount })),
)

const uploaderConfig = {
  count: { label: t('statistics.fileCount'), color: 'hsl(var(--chart-1))' },
} satisfies ChartConfig

// ---- 文件类型分布 ----
const typeColorMap: Record<string, string> = {
  image: 'hsl(var(--chart-1))',
  video: 'hsl(var(--chart-2))',
  audio: 'hsl(var(--chart-3))',
  pdf: 'hsl(var(--chart-4))',
  doc: 'hsl(var(--chart-5))',
  xls: 'hsl(210, 70%, 50%)',
  ppt: 'hsl(280, 60%, 55%)',
  archive: 'hsl(30, 80%, 55%)',
  text: 'hsl(150, 50%, 45%)',
  other: 'hsl(0, 0%, 60%)',
}

type TypeItem = { type: string; fileCount: number; fill: string }

const typeData = computed<TypeItem[]>(() =>
  fileTypes.value.map(ft => ({
    type: ft.type,
    fileCount: ft.file_count,
    fill: typeColorMap[ft.type] || typeColorMap.other,
  })),
)

const typeConfig = computed(() => {
  const config: Record<string, { label: string; color: string }> = {
    fileCount: { label: t('statistics.fileCount'), color: '' },
  }
  for (const ft of fileTypes.value) {
    config[ft.type] = {
      label: t(`statistics.type.${ft.type}`, ft.type),
      color: typeColorMap[ft.type] || typeColorMap.other,
    }
  }
  return config satisfies ChartConfig
})

// ---- 通用 ----
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

const hasData = computed(() => rawDaily.value.length > 0 || uploaders.value.length > 0 || fileTypes.value.length > 0)
</script>

<template>
  <div class="space-y-6">
    <!-- 头部 -->
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
    <div v-if="selectedLibraryId && hasData" class="grid gap-4 md:grid-cols-2">
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

    <!-- 上传趋势 -->
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
        <div v-else-if="!hasChartData" class="text-muted-foreground py-16 text-center">{{ t('common.noData') }}</div>
        <ChartContainer v-else :config="trendConfig" class="aspect-auto h-[300px] w-full" :cursor="false">
          <VisXYContainer :data="chartData" :svg-defs="svgDefs" :margin="{ left: 10 }" :y-domain="[0, yMax]">
            <VisArea
              :x="(d: ChartItem) => d.date.getTime()"
              :y="[(d: ChartItem) => d.fileCount, (d: ChartItem) => d.totalSizeMB]"
              :color="(_d: ChartItem, i: number) => ['url(#fillFileCount)', 'url(#fillTotalSizeMB)'][i]"
              :opacity="0.6"
            />
            <VisLine
              :x="(d: ChartItem) => d.date.getTime()"
              :y="[(d: ChartItem) => d.fileCount, (d: ChartItem) => d.totalSizeMB]"
              :color="(_d: ChartItem, i: number) => [trendConfig.fileCount.color, trendConfig.totalSizeMB.color][i]"
              :line-width="1.5"
            />
            <VisAxis
              type="x"
              :x="(d: ChartItem) => d.date.getTime()"
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
              :template="componentToString(trendConfig, ChartTooltipContent, {
                labelFormatter: (d: any) => new Date(d).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
              })"
              :color="(_d: ChartItem, i: number) => [trendConfig.fileCount.color, trendConfig.totalSizeMB.color][i % 2]"
            />
          </VisXYContainer>
        </ChartContainer>
      </CardContent>
    </Card>

    <!-- 上传人员排行 + 文件类型分布 -->
    <div v-if="selectedLibraryId && hasData" class="grid gap-6 md:grid-cols-2">
      <!-- 上传人员排行（横向条形图） -->
      <Card>
        <CardHeader>
          <CardTitle>{{ t('statistics.uploaderRank') }}</CardTitle>
          <CardDescription>{{ t('statistics.uploaderRankDesc') }}</CardDescription>
        </CardHeader>
        <CardContent>
          <div v-if="!uploaderData.length" class="text-muted-foreground py-8 text-center">{{ t('common.noData') }}</div>
          <ChartContainer v-else :config="uploaderConfig" class="aspect-auto h-[300px] w-full">
            <VisXYContainer :data="uploaderData" :margin="{ left: 80 }">
              <VisGroupedBar
                :x="(d: UploaderItem) => d.index"
                :y="(d: UploaderItem) => d.count"
                :color="uploaderConfig.count.color"
                :rounded-corners="4"
                :orientation="Orientation.Horizontal"
              />
              <VisAxis
                type="x"
                :tick-line="false"
                :domain-line="false"
                :num-ticks="4"
              />
              <VisAxis
                type="y"
                :tick-line="false"
                :domain-line="false"
                :grid-line="false"
                :tick-values="uploaderData.map(d => d.index)"
                :tick-format="(_: any, i: number) => uploaderData[i]?.name || ''"
              />
              <ChartTooltip />
              <ChartCrosshair
                :template="componentToString(uploaderConfig, ChartTooltipContent, { hideLabel: true })"
                color="#0000"
              />
            </VisXYContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <!-- 文件类型分布（甜甜圈图） -->
      <Card class="flex flex-col">
        <CardHeader class="items-center pb-0">
          <CardTitle>{{ t('statistics.fileTypeDist') }}</CardTitle>
          <CardDescription>{{ t('statistics.fileTypeDistDesc') }}</CardDescription>
        </CardHeader>
        <CardContent class="flex-1 pb-0">
          <div v-if="!typeData.length" class="text-muted-foreground py-8 text-center">{{ t('common.noData') }}</div>
          <ChartContainer v-else :config="typeConfig" class="mx-auto aspect-square max-h-[280px]">
            <VisSingleContainer :data="typeData" :margin="{ top: 30, bottom: 30 }">
              <VisDonut
                :value="(d: TypeItem) => d.fileCount"
                :color="(d: TypeItem) => typeColorMap[d.type] || typeColorMap.other"
                :arc-width="40"
              />
              <ChartTooltip
                :triggers="{
                  [Donut.selectors.segment]: componentToString(typeConfig, ChartTooltipContent, { hideLabel: true })!,
                }"
              />
            </VisSingleContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>

    <Card v-if="!selectedLibraryId">
      <CardContent class="text-muted-foreground py-16 text-center">
        {{ t('statistics.selectLibrary') }}
      </CardContent>
    </Card>
  </div>
</template>
