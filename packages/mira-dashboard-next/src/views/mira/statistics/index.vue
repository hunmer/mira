<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { statisticsApi, adminApi } from '@/api'
import { useLibrary } from '@/composables/useLibrary'
import { useBroadcast } from '@/composables/useBroadcast'
import type { ChartConfig } from '@/components/ui/chart'
import { Donut } from '@unovis/ts'
import { VisArea, VisAxis, VisLine, VisXYContainer, VisDonut, VisSingleContainer } from '@unovis/vue'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ChartContainer, ChartTooltipContent, ChartCrosshair, ChartTooltip, componentToString,
} from '@/components/ui/chart'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { RiNotificationLine, RiLoader4Line } from '@remixicon/vue'

const { t } = useI18n()
const { dialogOpen: broadcastDialogOpen, broadcastTitle, broadcastMsg, sending, openDialog: openBroadcastDialog, sendBroadcast } = useBroadcast()

function openBroadcastWithSummary() {
  const lines = recentUploads.value.flatMap(day =>
    day.items.map(item => `${item.userName} ${t('statistics.uploaded')} ${item.fileCount} ${t('statistics.uploadedTo')} ${item.target}`)
  )
  broadcastMsg.value = lines.join('\n')
  broadcastDialogOpen.value = true
}

interface DailyRow { date: string; file_count: number; total_size: number }
interface UploaderRow { uploader: number | null; uploaderName: string; fileCount: number; totalSize: number }
interface FileTypeRow { type: string; file_count: number; total_size: number }
interface RecentUploadDay { date: string; items: { userName: string; uploader: number | null; target: string; targetType: string; targetId: number | null; fileCount: number }[] }

const { selectedId: selectedLibraryId } = useLibrary()
const rawDaily = ref<DailyRow[]>([])
const uploaders = ref<UploaderRow[]>([])
const fileTypes = ref<FileTypeRow[]>([])
const recentUploads = ref<RecentUploadDay[]>([])
const loading = ref(false)
const timeRange = ref<number>(30)

const TIME_OPTIONS = [
  { label: () => t('statistics.1d'), value: 1 },
  { label: () => t('statistics.7d'), value: 7 },
  { label: () => t('statistics.30d'), value: 30 },
  { label: () => t('statistics.180d'), value: 180 },
  { label: () => t('statistics.365d'), value: 365 },
]

async function loadStats() {
  if (!selectedLibraryId.value) return
  loading.value = true
  try {
    const days = timeRange.value
    const [dailyRes, uploadRes, typeRes, recentRes]: any[] = await Promise.all([
      statisticsApi.daily(selectedLibraryId.value, days),
      statisticsApi.upload(selectedLibraryId.value, days),
      statisticsApi.fileTypes(selectedLibraryId.value, days),
      statisticsApi.recentUploads(selectedLibraryId.value, days),
    ])
    rawDaily.value = dailyRes.data?.data || []
    uploaders.value = uploadRes.data?.data || []
    fileTypes.value = typeRes.data?.data || []
    recentUploads.value = recentRes.data?.data || []
  } catch {
    rawDaily.value = []
    uploaders.value = []
    fileTypes.value = []
  } finally {
    loading.value = false
  }
}

watch(selectedLibraryId, loadStats)
watch(timeRange, loadStats)

// initial load
loadStats()

// ---- 趋势图 ----
type ChartItem = { date: Date; fileCount: number; totalSizeMB: number }

const chartData = computed<ChartItem[]>(() => {
  const days = timeRange.value
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
function nameToColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  const h = ((hash % 360) + 360) % 360
  return `hsl(${h}, 65%, 50%)`
}

type UploaderItem = { index: number; name: string; uploaderId: number | null; count: number; fill: string }

const uploaderData = computed<UploaderItem[]>(() =>
  [...uploaders.value]
    .sort((a, b) => b.fileCount - a.fileCount)
    .map((u, i) => ({
      index: i,
      name: u.uploaderName,
      uploaderId: u.uploader,
      count: u.fileCount,
      fill: nameToColor(u.uploaderName),
    })),
)

const maxUploaderCount = computed(() =>
  uploaderData.value.length ? Math.max(...uploaderData.value.map(d => d.count)) : 0,
)

// ---- 文件类型分布 ----
const typeColorMap: Record<string, string> = {
  image: 'hsl(220, 70%, 55%)',
  video: 'hsl(160, 60%, 45%)',
  audio: 'hsl(40, 80%, 50%)',
  pdf: 'hsl(340, 65%, 50%)',
  doc: 'hsl(260, 55%, 55%)',
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

function daysAgo(dateStr: string) {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const d = new Date(dateStr + 'T00:00:00')
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return '今天'
  if (diff === 1) return '昨天'
  return `${diff}天前`
}

// ---- 用户信息 Dialog ----
import type { User } from '@/types/auth'

const userDialogVisible = ref(false)
const userDialogLoading = ref(false)
const userDialogUser = ref<User | null>(null)

async function showUserDialog(uploaderId: number | null) {
  if (!uploaderId) return
  userDialogVisible.value = true
  userDialogLoading.value = true
  try {
    const res: any = await adminApi.list()
    const users: User[] = Array.isArray(res.data) ? res.data : (res.data?.data || [])
    userDialogUser.value = users.find(u => String(u.id) === String(uploaderId)) || null
  } catch {
    userDialogUser.value = null
  } finally {
    userDialogLoading.value = false
  }
}

// ---- mira:// 协议链接 ----
function createMiraUrl(tabType: 'folder' | 'tag', id: number | null, name: string) {
  if (id == null) return ''
  const payload = { type: 'openTab', data: { tabType, id, name, libraryId: selectedLibraryId.value } }
  const json = JSON.stringify(payload)
  const base64 = btoa(unescape(encodeURIComponent(json)))
  return `mira://?json=${base64}`
}
</script>

<template>
  <div class="space-y-6">
    <!-- 头部 + 汇总 -->
    <div class="flex items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold">{{ t('statistics.title') }}</h1>
        <p class="text-muted-foreground text-sm">{{ t('statistics.subtitle') }}</p>
      </div>
      <div v-if="selectedLibraryId" class="flex items-center gap-3 shrink-0">
        <div class="inline-flex h-8 rounded-md bg-muted p-0.5">
          <Button
            v-for="opt in TIME_OPTIONS"
            :key="opt.value"
            :variant="timeRange === opt.value ? 'outline' : 'ghost'"
            size="sm"
            class="h-7 rounded-sm px-2.5 text-xs data-[variant=outline]:bg-background data-[variant=outline]:shadow-sm"
            @click="timeRange = opt.value"
          >{{ opt.label() }}</Button>
        </div>
        <template v-if="hasData">
          <Badge variant="secondary">{{ t('statistics.fileCount') }}: {{ summary.totalFiles }}</Badge>
          <Badge variant="secondary">{{ t('statistics.totalSize') }}: {{ formatSize(summary.totalSize) }}</Badge>
        </template>
      </div>
    </div>

    <!-- 无数据占位 -->
    <div v-if="selectedLibraryId && !loading && !hasData" class="flex flex-col items-center justify-center py-24 text-center">
      <div class="rounded-full bg-muted p-4 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="size-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      </div>
      <p class="text-lg font-medium text-muted-foreground">{{ t('statistics.noData') }}</p>
      <p class="text-sm text-muted-foreground/70 mt-1">{{ t('statistics.noDataHint') }}</p>
    </div>

    <!-- 上传趋势 + 最近上传记录 -->
    <div v-if="selectedLibraryId && hasData" class="grid gap-6 lg:grid-cols-[3fr_2fr]">
      <!-- 上传趋势 -->
      <Card class="pt-0">
        <CardHeader class="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
          <div class="grid flex-1 gap-1">
            <CardTitle>{{ t('statistics.trend') }}</CardTitle>
            <CardDescription>{{ t('statistics.trendDesc') }}</CardDescription>
          </div>
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

      <!-- 最近上传记录 -->
      <div v-if="recentUploads.length" class="overflow-hidden rounded-lg border bg-card">
        <div class="flex items-center justify-between border-b px-4 py-3">
          <div class="flex items-center gap-2">
            <span class="font-medium text-sm">{{ t('statistics.recentUploads') }}</span>
            <span class="text-muted-foreground text-xs">{{ recentUploads.reduce((s, d) => s + d.items.length, 0) }} events</span>
          </div>
          <Button variant="ghost" size="sm" class="h-7 px-2 text-xs" @click="openBroadcastWithSummary">
            <RiNotificationLine class="mr-1 size-3.5" />
            {{ t('device.broadcast') }}
          </Button>
        </div>
        <div class="px-4 py-3 overflow-y-auto max-h-[380px]">
          <div class="relative">
            <template v-for="(day, di) in recentUploads" :key="day.date">
              <div v-for="(item, i) in day.items" :key="di + '-' + i" class="relative flex gap-3 pb-6 last:pb-0">
                <div v-if="i < day.items.length - 1 || di < recentUploads.length - 1" class="absolute top-8 bottom-0 left-[15px] w-px bg-border"></div>
                <div class="relative z-10 shrink-0">
                  <Avatar class="size-8 ring-2 ring-card">
                    <AvatarImage v-if="item.uploader" :src="`/api/user/avatar/${item.uploader}`" />
                    <AvatarFallback class="text-[11px]">{{ item.userName?.slice(0, 2).toUpperCase() }}</AvatarFallback>
                  </Avatar>
                </div>
                <div class="min-w-0 flex-1 pt-0.5">
                  <p class="text-sm leading-relaxed">
                    <a
                      v-if="item.uploader"
                      class="cursor-pointer font-medium hover:underline"
                      @click.prevent="showUserDialog(item.uploader)"
                    >{{ item.userName }}</a>
                    <span v-else class="font-medium">{{ item.userName }}</span>
                    <span class="text-muted-foreground"> {{ t('statistics.uploaded') }} </span>
                    <span class="font-medium">{{ item.fileCount }}</span>
                    <span class="text-muted-foreground"> {{ t('statistics.uploadedTo') }} </span>
                    <a
                      v-if="item.targetId != null"
                      :href="createMiraUrl(item.targetType as 'folder' | 'tag', item.targetId, item.target)"
                      class="font-medium text-primary hover:underline"
                    >{{ item.target }}</a>
                    <span v-else class="font-medium">{{ item.target }}</span>
                  </p>
                  <div class="mt-1 flex items-center gap-2">
                    <span class="text-muted-foreground text-xs">{{ daysAgo(day.date) }}</span>
                    <Badge v-if="item.targetType" variant="secondary" class="h-5 text-[10px]">{{ item.targetType }}</Badge>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

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
          <div v-else class="space-y-3">
            <div v-for="u in uploaderData" :key="u.index" class="flex items-center gap-3">
              <div class="flex items-center gap-2 w-24 shrink-0">
                <Avatar class="size-6">
                  <AvatarImage v-if="u.uploaderId" :src="`/api/user/avatar/${u.uploaderId}`" />
                  <AvatarFallback class="text-[9px]">{{ u.name?.slice(0, 1).toUpperCase() }}</AvatarFallback>
                </Avatar>
                <span
                  v-if="u.uploaderId"
                  class="text-xs truncate cursor-pointer hover:underline"
                  @click="showUserDialog(u.uploaderId)"
                >{{ u.name }}</span>
                <span v-else class="text-xs truncate">{{ u.name }}</span>
              </div>
              <div class="flex-1 flex items-center gap-2 min-w-0">
                <div class="flex-1 h-6 rounded bg-muted overflow-hidden min-w-0">
                  <div
                    class="h-full rounded transition-all duration-500"
                    :style="{ width: maxUploaderCount ? (u.count / maxUploaderCount * 100) + '%' : '0%', backgroundColor: u.fill }"
                  />
                </div>
                <span class="text-xs text-muted-foreground w-10 text-right shrink-0">{{ u.count }}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- 文件类型分布（甜甜圈图） -->
      <Card class="flex flex-col">
        <CardHeader class="items-center pb-0">
          <CardTitle>{{ t('statistics.fileTypeDist') }}</CardTitle>
          <CardDescription>{{ t('statistics.fileTypeDistDesc') }}</CardDescription>
        </CardHeader>
        <CardContent class="flex-1 pb-0 flex flex-col items-center gap-4">
          <div v-if="!typeData.length" class="text-muted-foreground py-8 text-center">{{ t('common.noData') }}</div>
          <template v-else>
            <ChartContainer :config="typeConfig" class="mx-auto aspect-square max-h-[220px]">
              <VisSingleContainer :data="typeData" :margin="{ top: 10, bottom: 10 }">
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
            <div class="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
              <div v-for="td in typeData" :key="td.type" class="flex items-center gap-1.5 text-xs">
                <span class="inline-block size-2.5 rounded-full" :style="{ backgroundColor: typeColorMap[td.type] || typeColorMap.other }" />
                <span>{{ t(`statistics.type.${td.type}`, td.type) }}</span>
                <span class="text-muted-foreground">{{ td.fileCount }}</span>
              </div>
            </div>
          </template>
        </CardContent>
      </Card>
    </div>

    <!-- 用户信息 Dialog -->
    <Dialog v-model:open="userDialogVisible">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{{ t('statistics.userInfo') }}</DialogTitle>
          <DialogDescription />
        </DialogHeader>
        <div v-if="userDialogLoading" class="py-8 text-center text-muted-foreground">{{ t('common.loading') }}</div>
        <div v-else-if="!userDialogUser" class="py-8 text-center text-muted-foreground">{{ t('common.noData') }}</div>
        <div v-else class="flex items-center gap-4">
          <Avatar class="h-14 w-14">
            <AvatarFallback class="text-lg">{{ userDialogUser.username.slice(0, 2).toUpperCase() }}</AvatarFallback>
          </Avatar>
          <div class="space-y-1">
            <div class="text-lg font-medium">{{ userDialogUser.username }}</div>
            <div class="text-muted-foreground text-sm">{{ userDialogUser.email }}</div>
            <div class="text-muted-foreground text-xs">
              {{ t('statistics.role') }}: {{ userDialogUser.role }}
              <span v-if="userDialogUser.createdAt"> &middot; {{ t('statistics.joinedAt') }}: {{ userDialogUser.createdAt?.slice(0, 10) }}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <!-- 广播对话框 -->
    <Dialog v-model:open="broadcastDialogOpen">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{{ t('device.broadcastTitle') }}</DialogTitle>
          <DialogDescription>{{ t('device.broadcastTo') }}: {{ t('device.allDevices') }}</DialogDescription>
        </DialogHeader>
        <Input v-model="broadcastTitle" :placeholder="t('device.broadcastTitlePlaceholder')" />
        <Textarea
          v-model="broadcastMsg"
          :placeholder="t('device.broadcastPlaceholder')"
          rows="4"
        />
        <DialogFooter>
          <Button variant="outline" @click="broadcastDialogOpen = false">{{ t('common.cancel') }}</Button>
          <Button :disabled="sending || !broadcastMsg.trim()" @click="sendBroadcast()">
            <RiLoader4Line v-if="sending" class="mr-2 size-4 animate-spin" />
            {{ t('device.send') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Card v-if="!selectedLibraryId">
      <CardContent class="text-muted-foreground py-16 text-center">
        {{ t('statistics.selectLibrary') }}
      </CardContent>
    </Card>
  </div>
</template>
