<template>
  <div class="p-4 space-y-6">
    <!-- 默认视图选项 -->
    <div>
      <div class="flex flex-wrap items-end gap-4 py-3">
        <div class="flex flex-col min-w-40 flex-1">
          <label class="text-foreground dark:text-muted-foreground text-base font-medium leading-normal pb-2">{{ t('settings.defaultViewMode') }}</label>
          <Select
            :model-value="defaultViewMode"
            @update:model-value="handleViewModeChange"
          >
            <SelectTrigger class="w-full">
              <SelectValue :placeholder="t('settings.defaultViewMode')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="opt in viewModeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</SelectItem>
            </SelectContent>
          </Select>
          <p class="text-muted-foreground dark:text-muted-foreground text-sm mt-2">{{ t('settings.defaultViewModeDesc') }}</p>
        </div>
      </div>
    </div>

    <!-- 默认分组 -->
    <div>
      <div class="flex flex-wrap items-end gap-4 py-3">
        <div class="flex flex-col min-w-40 flex-1">
          <label class="text-foreground dark:text-muted-foreground text-base font-medium leading-normal pb-2">{{ t('settings.defaultGrouping') }}</label>
          <Select :model-value="defaultGroupingMode" @update:model-value="handleGroupingChange">
            <SelectTrigger class="w-full">
              <SelectValue :placeholder="t('settings.defaultGrouping')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="opt in groupingOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</SelectItem>
            </SelectContent>
          </Select>
          <p class="text-muted-foreground dark:text-muted-foreground text-sm mt-2">{{ t('settings.defaultGroupingDesc') }}</p>
        </div>
      </div>
    </div>

    <!-- 默认过滤器 -->
    <div>
      <div class="flex flex-wrap items-end gap-4 py-3">
        <div class="flex flex-col min-w-40 flex-1">
          <label class="text-foreground dark:text-muted-foreground text-base font-medium leading-normal pb-2">{{ t('settings.defaultFilter') }}</label>
          <Select
            :model-value="defaultFilterId"
            @update:model-value="handleDefaultFilterChange"
          >
            <SelectTrigger class="w-full">
              <SelectValue :placeholder="t('settings.defaultFilterNone')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{{ t('settings.defaultFilterNone') }}</SelectItem>
              <SelectItem v-for="filter in savedFilters" :key="filter.id" :value="filter.id">{{ filter.name }}</SelectItem>
            </SelectContent>
          </Select>
          <p class="text-muted-foreground dark:text-muted-foreground text-sm mt-2">{{ t('settings.defaultFilterDesc') }}</p>
        </div>
      </div>
    </div>

    <!-- 单页最多展示 -->
    <div>
      <div class="flex flex-wrap items-end gap-4 py-3">
        <div class="flex flex-col min-w-40 flex-1">
          <label class="text-foreground dark:text-muted-foreground text-base font-medium leading-normal pb-2">{{ t('settings.pageSize') }}</label>
          <Select :model-value="String(pageSize)" @update:model-value="handlePageSizeChange">
            <SelectTrigger class="w-full">
              <SelectValue :placeholder="t('settings.pageSize')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="opt in pageSizeOptions" :key="opt" :value="String(opt)">{{ opt }}</SelectItem>
            </SelectContent>
          </Select>
          <p class="text-muted-foreground dark:text-muted-foreground text-sm mt-2">{{ t('settings.pageSizeDesc') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from '@/renderer/composables/useToast'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import {
  loadLibraryPrefs,
  saveLibraryDefaultViewMode,
  getLibraryPrefs,
  setDefaultFilterId,
  saveLibraryDefaultGroupingMode,
  saveLibraryPageSize,
  type LibraryDefaultViewMode,
  type LibraryDefaultGroupingMode
} from '@renderer/composables/LibraryPrefs'

const { t } = useI18n()
const toast = useToast()

const defaultViewMode = ref<LibraryDefaultViewMode>('grid')
const defaultGroupingMode = ref<LibraryDefaultGroupingMode>('none')

// 已保存过滤器列表（响应式，删除过滤器等操作会自动同步）
const savedFilters = computed(() => getLibraryPrefs().savedFilters)
const defaultFilterId = ref('')
const pageSize = ref(getLibraryPrefs().pageSize)
const pageSizeOptions = [100, 200, 500, 1000, 2000, 5000]

onMounted(async () => {
  await loadLibraryPrefs()
  defaultViewMode.value = getLibraryPrefs().defaultViewMode
  defaultGroupingMode.value = getLibraryPrefs().defaultGroupingMode
  defaultFilterId.value = getLibraryPrefs().defaultFilterId
  pageSize.value = getLibraryPrefs().pageSize
})

const viewModeOptions = [
  { label: t('composables.useViewModeConfig.gridView'), value: 'grid' },
  { label: t('composables.useViewModeConfig.listView'), value: 'list' },
  { label: t('composables.useViewModeConfig.waterfallView'), value: 'waterfall' },
  { label: t('settings.useLastView'), value: 'last' }
] as { label: string; value: LibraryDefaultViewMode }[]

const groupingOptions = [
  { label: '无', value: 'none' },
  { label: '按标签', value: 'tags' },
  { label: '按文件夹', value: 'folders' },
  { label: '按文件类型', value: 'types' },
  { label: t('settings.useLastGrouping'), value: 'last' }
] as { label: string; value: LibraryDefaultGroupingMode }[]

const handleGroupingChange = async (value: any) => {
  const mode = value as LibraryDefaultGroupingMode
  await saveLibraryDefaultGroupingMode(mode)
  defaultGroupingMode.value = mode
  toast.add({
    severity: 'success',
    summary: t('settings.settingSaved'),
    detail: t('settings.defaultGroupingUpdated', { mode: groupingOptions.find(opt => opt.value === mode)?.label }),
    life: 2000
  })
}

const handleViewModeChange = async (value: any) => {
  const mode = value as LibraryDefaultViewMode
  try {
    await saveLibraryDefaultViewMode(mode)
    defaultViewMode.value = mode
    toast.add({
      severity: 'success',
      summary: t('settings.settingSaved'),
      detail: t('settings.defaultViewModeUpdated', { mode: viewModeOptions.find(opt => opt.value === mode)?.label }),
      life: 2000
    })
  } catch (error) {
    console.error('Failed to save default view mode:', error)
    toast.add({
      severity: 'error',
      summary: t('settings.saveFailed'),
      detail: error instanceof Error ? error.message : t('settings.saveError'),
      life: 5000
    })
  }
}

const handlePageSizeChange = async (value: any) => {
  try {
    const size = Number(value)
    await saveLibraryPageSize(size)
    pageSize.value = getLibraryPrefs().pageSize
    toast.add({
      severity: 'success',
      summary: t('settings.settingSaved'),
      detail: t('settings.pageSizeUpdated', { count: pageSize.value }),
      life: 2000
    })
  } catch (error) {
    console.error('Failed to save page size:', error)
    toast.add({
      severity: 'error',
      summary: t('settings.saveFailed'),
      detail: error instanceof Error ? error.message : t('settings.saveError'),
      life: 5000
    })
  }
}

const handleDefaultFilterChange = async (value: any) => {
  try {
    const filterId = String(value || '')
    await setDefaultFilterId(filterId)
    defaultFilterId.value = filterId
    toast.add({
      severity: 'success',
      summary: t('settings.settingSaved'),
      detail: t('settings.defaultFilterUpdated', {
        name: filterId ? savedFilters.value.find(f => f.id === filterId)?.name : t('settings.defaultFilterNone')
      }),
      life: 2000
    })
  } catch (error) {
    console.error('Failed to save default filter:', error)
    toast.add({
      severity: 'error',
      summary: t('settings.saveFailed'),
      detail: error instanceof Error ? error.message : t('settings.saveError'),
      life: 5000
    })
  }
}
</script>
