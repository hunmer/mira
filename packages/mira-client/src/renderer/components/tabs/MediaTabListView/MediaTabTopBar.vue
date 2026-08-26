<script setup lang="ts">
import FilterBar from '@/renderer/components/business/FilterBar/FilterBar.vue'
import { Dropdown } from '@/renderer/components/common/Dropdown'
import type { FilterRule } from '@/renderer/types/filter'

/**
 * 顶部工具栏：筛选栏 + 更多操作菜单（视图切换 / 刷新 / 区块自定义）
 * 从 MediaTabListView.vue 按功能拆出，逻辑保持不变。
 */
defineProps<{
  filterRules: FilterRule[]
  isAllSelected: boolean
  folderTreeItems?: any[]
  tagTreeItems?: any[]
  sortField?: string
  sortOrder?: string
  appliedFilterId?: string | null
  viewModes: Array<{ value: string; label: string; icon: string }>
  viewMode: string
  isLoading: boolean
}>()

const emit = defineEmits<{
  selectAll: []
  filterChange: [filter: FilterRule]
  filterClear: [filter: FilterRule]
  sortChange: [sort: string, order: string]
  applySavedFilter: [filterId: string, rules: FilterRule[]]
  clearFilters: []
  viewModeChange: [mode: 'grid' | 'list' | 'waterfall']
  manualRefresh: []
  customizeSections: []
}>()
</script>

<template>
  <!-- 顶部筛选栏和工具按钮 -->
  <div class="flex space-x-3 " style="align-items: baseline">
    <div class="flex-1 min-w-0">
      <FilterBar :filters="filterRules" :is-all-selected="isAllSelected" :folder-tree-items="folderTreeItems"
        :tag-tree-items="tagTreeItems" :sort="sortField as any" :order="sortOrder as any" @select-all="emit('selectAll')"
        @filter-change="filter => emit('filterChange', filter)"
        @filter-clear="filter => emit('filterClear', filter)"
        @sort-change="(sort, order) => emit('sortChange', sort, order)"
        @apply-saved-filter="(filterId, rules) => emit('applySavedFilter', filterId, rules)"
        @clear-filters="emit('clearFilters')" :applied-filter-id="appliedFilterId" />
    </div>
    <div class="flex-shrink-0 flex items-center space-x-2">
      <!-- 更多操作下拉菜单：视图切换 + 刷新 -->
      <Dropdown :offset="{ x: 0, y: 4 }" placement="bottom-end" min-width="120px">
        <template #trigger>
          <button
            class="flex items-center rounded-lg border border-white/60 dark:border-border bg-white/40 dark:bg-muted/60 backdrop-blur shadow-sm hover:bg-white/60 dark:hover:bg-muted transition-colors"
            :title="$t('tabs.mediaTabListView.moreActions')" style="padding: 6px;">
            <span class="material-icons text-sm text-muted-foreground dark:text-muted-foreground">more_vert</span>
          </button>
        </template>

        <template #content="{ close }">
          <div class="py-1">
            <button v-for="mode in viewModes" :key="mode.value" :class="[
              'w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-lg hover:bg-primary/5 transition-colors',
              viewMode === mode.value ? 'bg-primary/10 text-primary' : 'text-foreground dark:text-muted-foreground'
            ]" @click="emit('viewModeChange', mode.value as 'grid' | 'list' | 'waterfall'); close()">
              <span class="material-icons text-sm">{{ mode.icon }}</span>
              <span>{{ mode.label }}</span>
              <span v-if="viewMode === mode.value" class="material-icons text-sm ml-auto text-primary">
                check
              </span>
            </button>
            <div class="my-1 border-t border-border dark:border-border"></div>
            <button
              class="w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-lg hover:bg-primary/5 text-foreground dark:text-muted-foreground transition-colors"
              @click="emit('manualRefresh'); close()">
              <span class="material-icons text-sm" :class="{ 'animate-spin': isLoading }">refresh</span>
              <span>{{ $t('tabs.mediaTabListView.refreshData') }}</span>
            </button>
            <button
              class="w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-lg hover:bg-primary/5 text-foreground dark:text-muted-foreground transition-colors"
              @click="emit('customizeSections'); close()">
              <span class="material-icons text-sm">dashboard_customize</span>
              <span>{{ $t('tabs.mediaTabListView.customizeSections') }}</span>
            </button>
          </div>
        </template>
      </Dropdown>
    </div>
  </div>
</template>

<style scoped>
.material-icons,
.material-symbols-outlined {
  font-size: 18px;
}

.transition-colors {
  transition-property: color, background-color, border-color;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 200ms;
}
</style>
