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
    <div v-else-if="!typeData.length" class="flex flex-1 flex-col items-center justify-center gap-1 text-muted-foreground">
      <span class="material-icons text-xl">donut_large</span>
      <span class="text-xs">{{ libraryId ? $t('tabs.statisticsCards.noData') : noLibrary }}</span>
    </div>

    <!-- 甜甜圈 + 图例 -->
    <template v-else>
      <div class="min-h-0 flex-1 p-2">
        <ChartContainer :config="typeConfig" class="mx-auto aspect-square size-full">
          <VisSingleContainer :data="typeData" :margin="{ top: 8, bottom: 8 }">
            <VisDonut :value="(d: TypeItem) => d.fileCount" :color="(d: TypeItem) => colorOf(d.type)" :arc-width="32" />
            <ChartTooltip
              :triggers="{
                [Donut.selectors.segment]: componentToString(typeConfig, ChartTooltipContent, { hideLabel: true })!,
              }"
            />
          </VisSingleContainer>
        </ChartContainer>
      </div>
      <div class="flex flex-wrap justify-center gap-x-3 gap-y-1 px-3 pb-3">
        <div v-for="td in typeData" :key="td.type" class="flex items-center gap-1 text-xs">
          <span class="inline-block size-2 rounded-full" :style="{ backgroundColor: colorOf(td.type) }" />
          <span>{{ $t(`tabs.statisticsCards.type.${td.type}`, td.type) }}</span>
          <span class="text-muted-foreground">{{ td.fileCount }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Donut } from '@unovis/ts'
import { VisSingleContainer, VisDonut } from '@unovis/vue'
import {
  ChartContainer, ChartTooltipContent, ChartTooltip, componentToString,
} from '@/components/ui/chart'
import type { ChartConfig } from '@/components/ui/chart'
import { useStatsCard, fileTypeColorMap, stats } from './useStatsCard'
import type { FileTypeRow } from './useStatsCard'

/**
 * 文件类型分布卡片：甜甜圈图 + 彩色图例。
 * 数据与 dashboard 统计页一致（statistics/file-types）。
 */
interface Props {
  config?: { days?: number }
}

const props = defineProps<Props>()
const configRef = computed(() => props.config) as Ref<Record<string, any> | undefined>

const { t } = useI18n()
const { loading, error, data, noLibrary, load, libraryId } = useStatsCard<FileTypeRow[]>(
  configRef,
  (lib, d) => stats().fileTypes(lib, d),
)

type TypeItem = { type: string; fileCount: number }

const colorOf = (type: string) => fileTypeColorMap[type] || fileTypeColorMap.other

const typeData = computed<TypeItem[]>(() =>
  (data.value ?? []).map((ft) => ({ type: ft.type, fileCount: ft.file_count })),
)

const typeConfig = computed(() => {
  const config: Record<string, { label: string; color: string }> = {
    fileCount: { label: t('tabs.statisticsCards.fileCount'), color: '' },
  }
  for (const ft of data.value ?? []) {
    config[ft.type] = {
      label: t(`tabs.statisticsCards.type.${ft.type}`, ft.type),
      color: colorOf(ft.type),
    }
  }
  return config satisfies ChartConfig
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
