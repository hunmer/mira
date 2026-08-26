<script setup lang="ts">
import { Dropdown } from '@/renderer/components/common/Dropdown'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import Breadcrumb from '@/renderer/components/common/Breadcrumb.vue'
import type { BreadcrumbItem } from '@renderer/controllers/HomeController'
import { useMediaTabItemFields } from './useMediaTabItemFields'

/**
 * 底部状态栏：面包屑导航 / 文件数 / 选中数 / 分页信息 / 列数滑块 / 紧密瀑布流与展示字段开关
 * 从 MediaTabListView.vue 按功能拆出，逻辑保持不变；展示字段开关（useMediaTabItemFields）随迁。
 */
const props = defineProps<{
  showBreadcrumb: boolean
  breadcrumbItems: BreadcrumbItem[]
  fileCount: number
  selectedCount: number
  currentPage: number
  totalPages: number
  viewMode: string
  columnsPerRow: number
  compactWaterfall: boolean
}>()

const emit = defineEmits<{
  breadcrumbSelect: [item: BreadcrumbItem]
  columnsChange: [event: Event]
  'update:compactWaterfall': [value: boolean]
}>()

const { itemFieldOptions, isItemFieldVisible, toggleItemField } = useMediaTabItemFields()
</script>

<template>
  <footer
    class="flex items-center justify-between px-2 pt-2 shrink-0 text-xs border-t border-white/60 dark:border-border">
    <div class="flex-1 flex items-center space-x-6 min-w-0">
      <!-- 路由状态 / 面包屑导航 -->
      <Breadcrumb v-if="props.showBreadcrumb"
        :items="breadcrumbItems.length > 1 ? breadcrumbItems : undefined"
        @select="item => emit('breadcrumbSelect', item)" />

      <!-- 当前路径和文件数 -->
      <div v-if="fileCount > 0" class="flex items-center space-x-1 flex-shrink-0 me-2">
        <span class="text-muted-foreground dark:text-muted-foreground">
          {{ $t('tabs.mediaTabListView.fileCount', { count: fileCount }) }}
        </span>
      </div>
    </div>

    <div class="flex items-center space-x-4">
      <!-- 已选择素材 - 仅在有选择时显示 -->
      <div v-if="selectedCount > 0" class="flex items-center space-x-1">
        <span class="text-primary font-medium">
          {{ $t('tabs.mediaTabListView.selectedCount', { count: selectedCount }) }}
        </span>
      </div>

      <!-- 分页信息 - 只有多页时显示 -->
      <div v-if="totalPages > 1" class="flex items-center space-x-1">
        <span class="text-muted-foreground dark:text-muted-foreground">
          {{ $t('tabs.mediaTabListView.pageInfo', { current: currentPage, total: totalPages }) }}
        </span>
      </div>

      <!-- 列数调整滑块 -->
      <div v-if="viewMode === 'grid' || viewMode === 'waterfall'" class="flex items-center space-x-2">
        <input class="w-24 h-1 bg-accent dark:bg-muted rounded-lg appearance-none cursor-pointer" type="range" min="2"
          max="8" :value="columnsPerRow" @input="event => emit('columnsChange', event)"
          :title="$t('tabs.mediaTabListView.adjustColumns')" />
      </div>

      <!-- 展示字段开关：控制三个视图下媒体项展示哪些信息 -->
      <Dropdown :offset="{ x: 0, y: 8 }" placement="top-end">
        <template #trigger>
          <button
            class="flex items-center justify-center rounded-lg p-1.5 text-muted-foreground dark:text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
            :title="$t('tabs.mediaTabListView.fieldSettingsTitle')">
            <span class="material-icons text-sm">visibility</span>
          </button>
        </template>

        <template #content>
          <div class="min-w-[160px] rounded-2xl bg-popover p-2">
            <h3 class="font-medium text-foreground text-sm mb-2 px-1">{{ $t('tabs.mediaTabListView.displayFields') }}
            </h3>
            <!-- 紧密瀑布流开关：仅瀑布流视图显示 -->
            <label v-if="viewMode === 'waterfall'"
              class="flex items-center justify-between space-x-2 px-2 py-1.5 rounded-lg hover:bg-primary/5 cursor-pointer">
              <span class="text-sm text-foreground">{{ $t('tabs.mediaTabListView.compactWaterfall') }}</span>
              <Switch :model-value="compactWaterfall"
                @update:model-value="val => emit('update:compactWaterfall', val === true)" />
            </label>
            <label v-for="col in itemFieldOptions" :key="col.key"
              class="flex items-center space-x-2 px-2 py-1.5 rounded-lg hover:bg-primary/5 cursor-pointer">
              <Checkbox :model-value="isItemFieldVisible(col.key)"
                @update:model-value="val => toggleItemField(col.key, val === true)" />
              <span class="text-sm text-foreground">{{ col.label }}</span>
            </label>
          </div>
        </template>
      </Dropdown>
    </div>
  </footer>
</template>
