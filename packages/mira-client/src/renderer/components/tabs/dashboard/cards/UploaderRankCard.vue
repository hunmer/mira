<template>
  <div ref="rootEl" class="flex h-full flex-col">
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

    <!-- 排行榜（复刻 21st.dev leaderboard-card：领奖台 + 排名列表） -->
    <div v-else class="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-2.5">
      <!-- 领奖台：前三名（第 2 名 - 第 1 名 - 第 3 名），高度不足时自动缩小 / 隐藏 -->
      <div
        v-if="podium.length && showPodium"
        class="mb-4 flex shrink-0 items-end justify-center"
        :class="podiumSize.wrap"
        role="list"
        aria-label="Top 3 rankings"
      >
        <div v-for="u in podium" :key="u.uploaderId ?? u.index" class="flex flex-col items-center" role="listitem">
          <div class="relative mb-2" aria-hidden="true">
            <Avatar :class="podiumSize.avatar">
              <AvatarImage v-if="u.uploaderId" :src="userAvatarUrl(u.uploaderId) || ''" />
              <AvatarFallback>{{ u.name?.slice(0, 1).toUpperCase() }}</AvatarFallback>
            </Avatar>
            <div class="bg-background absolute -right-1 -bottom-1 flex items-center justify-center rounded-full shadow-sm" :class="podiumSize.badge">
              <Crown :class="[podiumSize.badgeIcon, rankMeta[u.index + 1]?.color]" />
            </div>
          </div>
          <span class="max-w-20 truncate text-center font-medium" :class="podiumSize.name" :title="u.name">{{ u.name }}</span>
          <span class="text-muted-foreground tabular-nums" :class="podiumSize.value">{{ u.count.toLocaleString() }}</span>
          <div
            aria-hidden="true"
            class="mt-2 rounded-t-lg"
            :class="[podiumSize.bar, compact ? rankMeta[u.index + 1]?.heightSm : rankMeta[u.index + 1]?.height, rankMeta[u.index + 1]?.bg]"
          >
            <div class="flex h-8 items-center justify-center font-bold" :class="rankMeta[u.index + 1]?.color">
              {{ u.index + 1 }}
            </div>
          </div>
        </div>
      </div>

      <!-- 排名列表（紧凑模式：小头像、隐藏体积副行） -->
      <div class="min-h-0 w-full flex-1 overflow-y-auto">
        <div class="divide-border divide-y" role="list" aria-label="Leaderboard rankings">
          <div
            v-for="u in rankData"
            :key="u.index"
            role="listitem"
            class="flex items-center gap-2 px-4"
            :class="[compact ? 'py-1.5' : 'py-2', u.isMe && 'border-primary bg-muted rounded-md border-2']"
          >
            <div class="flex w-12 items-center gap-1">
              <span class="w-4 text-sm font-semibold tabular-nums">{{ u.index + 1 }}</span>
              <Crown v-if="u.index < 3" class="h-5 w-5" :class="rankMeta[u.index + 1]?.color" aria-hidden="true" />
            </div>
            <Avatar :class="compact ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm font-medium'">
              <AvatarImage v-if="u.uploaderId" :src="userAvatarUrl(u.uploaderId) || ''" />
              <AvatarFallback>{{ u.name?.slice(0, 1).toUpperCase() }}</AvatarFallback>
            </Avatar>
            <div class="min-w-0 flex-1">
              <p class="text-foreground truncate font-medium">{{ u.name }}</p>
              <p v-if="!compact" class="text-muted-foreground truncate text-sm" :title="formatSize(u.totalSize)">
                {{ formatSize(u.totalSize) }}
              </p>
            </div>
            <p class="text-right font-semibold leading-none tabular-nums" :title="u.count.toLocaleString()">
              {{ formatCount(u.count) }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Ref } from 'vue'
import { Crown } from 'lucide-vue-next'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuthStore } from '@renderer/stores/auth'
import { useStatsCard, formatSize, stats, userAvatarUrl } from './useStatsCard'
import type { UploaderRow } from './useStatsCard'

/**
 * 上传人员排行卡片：复刻 21st.dev leaderboard-card 视觉（领奖台 + 排名列表）。
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

const authStore = useAuthStore()
const currentUserName = computed(() => authStore.user?.realName || authStore.user?.username || '')

const rankData = computed(() =>
  [...(data.value ?? [])]
    .sort((a, b) => b.fileCount - a.fileCount)
    .map((u, i) => ({
      index: i,
      name: u.uploaderName,
      uploaderId: u.uploader,
      count: u.fileCount,
      totalSize: u.totalSize,
      isMe: !!u.uploaderName && u.uploaderName === currentUserName.value,
    })),
)

/** 领奖台顺序：第 2 名 - 第 1 名 - 第 3 名（缺员自动跳过） */
const podium = computed(() => {
  const top = rankData.value.slice(0, 3)
  const byRank = [top[1], top[0], top[2]]
  return byRank.filter(Boolean)
})

/** 前三名样式（金 / 银 / 铜，取自 21st.dev 原组件 --color-rank-* token；heightSm 为紧凑档柱高） */
const rankMeta: Record<number, { color: string; bg: string; height: string; heightSm: string }> = {
  1: { color: 'text-[#f59e0b]', bg: 'bg-[#f59e0b]/60', height: 'h-32', heightSm: 'h-24' },
  2: { color: 'text-[#94a3b8]', bg: 'bg-[#94a3b8]/30', height: 'h-24', heightSm: 'h-20' },
  3: { color: 'text-[#b45309]', bg: 'bg-[#b45309]/50', height: 'h-20', heightSm: 'h-16' },
}

/** 领奖台 / 列表随卡片高度自适应（对应原组件 size=default / sm 两档） */
const rootEl = ref<HTMLElement | null>(null)
const rootHeight = ref(0)
let resizeObserver: ResizeObserver | undefined

onMounted(() => {
  if (!rootEl.value) return
  resizeObserver = new ResizeObserver(([entry]) => {
    rootHeight.value = entry.contentRect.height
  })
  resizeObserver.observe(rootEl.value)
})
onBeforeUnmount(() => resizeObserver?.disconnect())

/** 内容区较矮时进入紧凑模式（原组件 sm 档参数） */
const compact = computed(() => rootHeight.value > 0 && rootHeight.value < 320)
/** 极矮卡片放不下领奖台，只保留列表 */
const showPodium = computed(() => rootHeight.value === 0 || rootHeight.value >= 210)

const podiumSize = computed(() =>
  compact.value
    ? {
        wrap: 'gap-2',
        avatar: 'h-10 w-10 text-sm',
        badge: 'h-5 w-5',
        badgeIcon: 'h-3 w-3',
        name: 'text-xs',
        value: 'text-xs',
        bar: 'w-20',
      }
    : {
        wrap: 'gap-4',
        avatar: 'h-14 w-14 text-lg',
        badge: 'h-6 w-6',
        badgeIcon: 'h-4 w-4',
        name: 'text-sm',
        value: 'text-sm',
        bar: 'w-22',
      },
)

/** 数值缩写（1k / 1.2m），与 21st.dev 原组件 formatLeaderboardValue 一致 */
function formatCount(v: number) {
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}m`
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}k`
  return v.toLocaleString()
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
