<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { CircleAlert, ImageOff, ImagePlus, Loader2, WifiOff } from '@lucide/vue'
import { MediaWaterfall } from 'mira-plugin-ui/library'
import { Button } from 'mira-plugin-ui/src/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from 'mira-plugin-ui/src/components/ui/empty'
import { t } from '@/lib/i18n'
import { DEMO_MEDIA } from '@/lib/mira'
import { addTasks, currentTask, loadMore, retryTask } from '@/stores/tasks'
import ResultCard from './ResultCard.vue'
import type { ResultItem } from '@/types'

/**
 * 右栏结果区：按当前任务状态切换空态/瀑布流；瀑布流布局复用
 * mira-plugin-ui 的通用 MediaWaterfall（columnWidth=缩放列宽，触底 reach-bottom
 * 触发 loadMore 以结果养结果）；切换任务时恢复各自滚动位置。
 */
const task = currentTask
const panel = ref<HTMLElement>()

const props = defineProps<{ scale: number }>()

function getAspectOf(item: ResultItem): string | undefined {
  return item.width > 0 && item.height > 0 ? `${item.width}:${item.height}` : undefined
}

function onScroll() {
  if (task.value && panel.value) task.value.scroll = panel.value.scrollTop
}

watch(
  () => task.value?.id,
  async () => {
    await nextTick()
    if (panel.value && task.value) panel.value.scrollTop = task.value.scroll
  },
)

onMounted(() => {
  if (panel.value && task.value) panel.value.scrollTop = task.value.scroll
})
</script>

<template>
  <section
    ref="panel"
    class="min-w-0 flex-1 overflow-y-auto bg-muted/30"
    @scroll.passive="onScroll"
  >
    <!-- 无任务 -->
    <div v-if="!task" class="flex h-full items-center justify-center p-6">
      <Empty class="max-w-md">
        <EmptyHeader>
          <EmptyMedia><ImagePlus /></EmptyMedia>
          <EmptyTitle>{{ t('main.empty.title') }}</EmptyTitle>
          <EmptyDescription>{{ t('main.empty.content') }}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" @click="addTasks(DEMO_MEDIA)">{{ t('main.empty.demo') }}</Button>
        </EmptyContent>
      </Empty>
    </div>

    <!-- 搜索中 -->
    <div v-else-if="task.state === 'waiting' || task.state === 'processing'" class="flex h-full items-center justify-center p-6">
      <Empty class="max-w-md border-none">
        <EmptyHeader>
          <EmptyMedia><Loader2 class="animate-spin" /></EmptyMedia>
          <EmptyTitle>{{ t('main.waiting.title') }}</EmptyTitle>
        </EmptyHeader>
      </Empty>
    </div>

    <!-- 失败：网络 / 未登录 / 其它 -->
    <div v-else-if="task.state === 'failed'" class="flex h-full items-center justify-center p-6">
      <Empty class="max-w-md border-none">
        <EmptyHeader>
          <EmptyMedia>
            <WifiOff v-if="task.error === 'Failed to fetch'" />
            <CircleAlert v-else />
          </EmptyMedia>
          <EmptyTitle>
            {{ task.error === 'Failed to fetch'
              ? t('main.connectError.title')
              : task.error === '401' ? t('main.authError.title') : t('main.error.title') }}
          </EmptyTitle>
          <EmptyDescription>
            {{ task.error === 'Failed to fetch'
              ? t('main.connectError.content')
              : task.error === '401' ? t('main.authError.content') : task.error }}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" @click="retryTask(task)">{{ t('main.connectError.retry') }}</Button>
        </EmptyContent>
      </Empty>
    </div>

    <!-- 成功但无结果 -->
    <div v-else-if="!task.results.length" class="flex h-full items-center justify-center p-6">
      <Empty class="max-w-md border-none">
        <EmptyHeader>
          <EmptyMedia><ImageOff /></EmptyMedia>
          <EmptyTitle>{{ t('main.noResult.title') }}</EmptyTitle>
          <EmptyDescription>{{ t('main.noResult.content') }}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>

    <!-- 瀑布流（mira-plugin-ui 通用 MediaWaterfall：列宽=scale，触底自动加载） -->
    <template v-else>
      <div class="p-4">
        <MediaWaterfall
          :items="task.results"
          :column-width="props.scale"
          :gap="16"
          :get-key="(item: ResultItem) => item.key"
          :get-aspect="getAspectOf"
          lazy
          @reach-bottom="loadMore(task)"
        >
          <template #default="{ item }">
            <ResultCard :item="item" :big="props.scale >= 400" />
          </template>
        </MediaWaterfall>
      </div>
      <div v-if="task.loadingMore" class="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground">
        <Loader2 class="size-4 animate-spin" />
        {{ t('main.loadingMore') }}
      </div>
    </template>
  </section>
</template>
