<template>
  <div class="filter-bar flex items-center space-x-4 mb-4 text-muted-foreground">
    <!-- 全选控制 -->
    <label class="flex items-center space-x-1 cursor-pointer select-none">
      <Checkbox :model-value="isAllSelected" @update:model-value="handleSelectAllChange" />
    </label>

    <div class="h-5 border-l border-border"></div>

    <!-- 筛选器 -->
    <div class="flex items-center space-x-3">
      <template v-for="filter in filters" :key="filter.id">
        <Dropdown :offset="{ x: 0, y: 8 }" placement="bottom-start" :close-on-content-click="false">
          <template #trigger="{ isOpen }">
            <Button variant="ghost" size="xs" :class="getFilterButtonClass(filter, isOpen)">
              <span class="relative">
                <span class="material-icons text-sm">{{ filter.icon }}</span>
                <span v-if="hasActiveFilters(filter)"
                  class="absolute -bottom-0.25 -right-1.5 bg-primary text-white text-[10px] rounded-full min-w-4 h-4 flex items-center justify-center leading-none px-0.5">
                  {{ getActiveFilterCount(filter) }}
                </span>
              </span>
            </Button>
          </template>

          <template #content="{ close }">
            <div class="min-w-[280px]">
              <!-- 文件夹筛选器 -->
              <div v-if="filter.type === 'folders'">
                <div class="max-h-[300px] overflow-y-auto p-2">
                  <FolderTreeComponent item-type="folder" :folders="folderTreeItems || []"
                    :selected-key="filter.selectedValues?.[0] != null ? String(filter.selectedValues[0]) : ''"
                    @select="(item: any) => updateFilterValues(filter, item.id ? [item.id] : [])" @refresh="() => { }" />
                </div>
                <div class="p-3 border-t border-border flex justify-end space-x-2">
                  <Button variant="ghost" size="sm" @click="clearFilter(filter); close()">{{ $t('business.filterBar.clear') }}</Button>
                  <Button size="sm" @click="close()">{{ $t('business.filterBar.confirm') }}</Button>
                </div>
              </div>

              <!-- 标签筛选器 -->
              <div v-else-if="filter.type === 'tags'">
                <div class="max-h-[300px] overflow-y-auto p-2">
                  <FolderTreeComponent item-type="tag" :tags="tagTreeItems || []"
                    @select="(item: any) => handleTagFilterSelect(filter, item)" @refresh="() => { }" />
                </div>
                <div class="p-3 border-t border-border flex justify-end space-x-2">
                  <Button variant="ghost" size="sm" @click="clearFilter(filter); close()">{{ $t('business.filterBar.clear') }}</Button>
                  <Button size="sm" @click="close()">{{ $t('business.filterBar.confirm') }}</Button>
                </div>
              </div>

              <!-- 网址筛选器 -->
              <div v-else-if="filter.type === 'urls'">
                <div class="p-3">
                  <h3 class="font-medium text-foreground mb-3">{{ $t('business.filterBar.urlFilterTitle') }}</h3>
                  <Input :model-value="filter.value" :placeholder="$t('business.filterBar.urlPlaceholder')"
                    @update:model-value="(val) => handleFilterInput(filter, val as string)" />
                </div>
                <div class="p-3 border-t border-border flex justify-end space-x-2">
                  <Button variant="ghost" size="sm" @click="clearFilter(filter); close()">{{ $t('business.filterBar.clear') }}</Button>
                  <Button size="sm" @click="close()">{{ $t('business.filterBar.confirm') }}</Button>
                </div>
              </div>

              <!-- 标题筛选器 -->
              <div v-else-if="filter.type === 'title'">
                <div class="p-3">
                  <h3 class="font-medium text-foreground mb-3">{{ $t('business.filterBar.titleFilterTitle') }}</h3>
                  <Input :model-value="filter.value" :placeholder="$t('business.filterBar.titlePlaceholder')"
                    @update:model-value="(val) => handleFilterInput(filter, val as string)" />
                </div>
                <div class="p-3 border-t border-border flex justify-end space-x-2">
                  <Button variant="ghost" size="sm" @click="clearFilter(filter); close()">{{ $t('business.filterBar.clear') }}</Button>
                  <Button size="sm" @click="close()">{{ $t('business.filterBar.confirm') }}</Button>
                </div>
              </div>

              <!-- 大小筛选器 -->
              <div v-else-if="filter.type === 'size'">
                <div class="p-3">
                  <h3 class="font-medium text-foreground mb-3">{{ $t('business.filterBar.sizeTitle') }}</h3>

                  <RadioGroup :model-value="filter.selectedPreset || ''" class="space-y-2 mb-4"
                    @update:model-value="(val) => handleSizePresetChange(filter, val as string)">
                    <label v-for="preset in sizePresets" :key="preset.id"
                      class="flex items-center space-x-2 cursor-pointer">
                      <RadioGroupItem :value="preset.id" />
                      <span class="text-sm cursor-pointer">{{ preset.label }}</span>
                    </label>

                    <div class="border-t border-border pt-3">
                      <label class="flex items-center space-x-2 cursor-pointer mb-3">
                        <RadioGroupItem value="custom" />
                        <span class="text-sm cursor-pointer">{{ $t('business.filterBar.sizeCustom') }}</span>
                      </label>

                      <div v-if="filter.selectedPreset === 'custom'" class="grid grid-cols-2 gap-2">
                        <div>
                          <Label class="block text-xs text-muted-foreground mb-1">{{ $t('business.filterBar.sizeMinLabel') }}</Label>
                          <Input type="number" :model-value="filter.customMin?.toString() ?? ''" placeholder="0"
                            @update:model-value="(val) => { filter.customMin = val ? Number(val) : undefined; updateCustomSizeRange(filter) }" />
                        </div>
                        <div>
                          <Label class="block text-xs text-muted-foreground mb-1">{{ $t('business.filterBar.sizeMaxLabel') }}</Label>
                          <Input type="number" :model-value="filter.customMax?.toString() ?? ''" :placeholder="$t('business.filterBar.sizeMaxPlaceholder')"
                            @update:model-value="(val) => { filter.customMax = val ? Number(val) : undefined; updateCustomSizeRange(filter) }" />
                        </div>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
                <div class="p-3 border-t border-border flex justify-end space-x-2">
                  <Button variant="ghost" size="sm" @click="clearFilter(filter); close()">{{ $t('business.filterBar.clear') }}</Button>
                  <Button size="sm" @click="close()">{{ $t('business.filterBar.confirm') }}</Button>
                </div>
              </div>

              <!-- 类别筛选器 -->
              <div v-else-if="filter.type === 'category'">
                <div class="p-3">
                  <h3 class="font-medium text-foreground mb-3">{{ $t('business.filterBar.categoryTitle') }}</h3>
                  <RadioGroup :model-value="filter.selectedCategory || ''" class="space-y-2"
                    @update:model-value="(val) => selectCategory(filter, val as string)">
                    <label v-for="category in categoryOptions" :key="category.value"
                      class="flex items-center space-x-2 cursor-pointer hover:bg-muted px-2 py-1 rounded">
                      <RadioGroupItem :value="category.value" />
                      <span class="material-icons text-sm text-muted-foreground">{{ category.icon }}</span>
                      <span class="text-sm cursor-pointer">{{ category.label }}</span>
                    </label>
                  </RadioGroup>
                </div>
                <div class="p-3 border-t border-border flex justify-end space-x-2">
                  <Button variant="ghost" size="sm" @click="clearFilter(filter); close()">{{ $t('business.filterBar.clear') }}</Button>
                  <Button size="sm" @click="close()">{{ $t('business.filterBar.confirm') }}</Button>
                </div>
              </div>

              <!-- 元数据筛选器（尺寸 / 时长） -->
              <div v-else-if="filter.type === 'metadata'">
                <div class="p-3">
                  <h3 class="font-medium text-foreground mb-3">{{ $t('business.filterBar.metadataTitle') }}</h3>

                  <!-- 子模式切换：尺寸 / 时长 -->
                  <ToggleGroup type="single" :model-value="filter.metaField || 'dimension'" variant="outline" size="sm"
                    class="w-full mb-4"
                    @update:model-value="(val) => val && handleMetaFieldChange(filter, val as 'dimension' | 'duration')">
                    <ToggleGroupItem value="dimension" class="flex-1">{{ $t('business.filterBar.metadataFieldDimension') }}</ToggleGroupItem>
                    <ToggleGroupItem value="duration" class="flex-1">{{ $t('business.filterBar.metadataFieldDuration') }}</ToggleGroupItem>
                  </ToggleGroup>

                  <!-- 尺寸子模式 -->
                  <template v-if="filter.metaField === 'duration' ? false : true">
                    <RadioGroup :model-value="filter.selectedMetaPreset || ''" class="space-y-2 mb-4"
                      @update:model-value="(val) => handleMetaPresetChange(filter, val as string)">
                      <label v-for="preset in dimensionPresets" :key="preset.id"
                        class="flex items-center space-x-2 cursor-pointer">
                        <RadioGroupItem :value="preset.id" />
                        <span class="text-sm cursor-pointer">{{ preset.label }}</span>
                      </label>

                      <div class="border-t border-border pt-3">
                        <label class="flex items-center space-x-2 cursor-pointer mb-3">
                          <RadioGroupItem value="custom" />
                          <span class="text-sm cursor-pointer">{{ $t('business.filterBar.sizeCustom') }}</span>
                        </label>

                        <div v-if="filter.selectedMetaPreset === 'custom'" class="grid grid-cols-2 gap-2">
                          <div>
                            <Label class="block text-xs text-muted-foreground mb-1">{{ $t('business.filterBar.dimensionCustomMin') }}</Label>
                            <Input type="number" :model-value="filter.customDimMin?.toString() ?? ''" placeholder="0"
                              @update:model-value="(val) => { filter.customDimMin = val ? Number(val) : undefined; updateCustomMetaRange(filter) }" />
                          </div>
                          <div>
                            <Label class="block text-xs text-muted-foreground mb-1">{{ $t('business.filterBar.dimensionCustomMax') }}</Label>
                            <Input type="number" :model-value="filter.customDimMax?.toString() ?? ''" :placeholder="$t('business.filterBar.sizeMaxPlaceholder')"
                              @update:model-value="(val) => { filter.customDimMax = val ? Number(val) : undefined; updateCustomMetaRange(filter) }" />
                          </div>
                        </div>
                      </div>
                    </RadioGroup>
                  </template>

                  <!-- 时长子模式 -->
                  <template v-else>
                    <RadioGroup :model-value="filter.selectedMetaPreset || ''" class="space-y-2 mb-4"
                      @update:model-value="(val) => handleMetaPresetChange(filter, val as string)">
                      <label v-for="preset in durationPresets" :key="preset.id"
                        class="flex items-center space-x-2 cursor-pointer">
                        <RadioGroupItem :value="preset.id" />
                        <span class="text-sm cursor-pointer">{{ preset.label }}</span>
                      </label>

                      <div class="border-t border-border pt-3">
                        <label class="flex items-center space-x-2 cursor-pointer mb-3">
                          <RadioGroupItem value="custom" />
                          <span class="text-sm cursor-pointer">{{ $t('business.filterBar.sizeCustom') }}</span>
                        </label>

                        <div v-if="filter.selectedMetaPreset === 'custom'" class="grid grid-cols-2 gap-2">
                          <div>
                            <Label class="block text-xs text-muted-foreground mb-1">{{ $t('business.filterBar.durationCustomMin') }}</Label>
                            <Input type="number" :model-value="filter.customDurMin?.toString() ?? ''" placeholder="0"
                              @update:model-value="(val) => { filter.customDurMin = val ? Number(val) : undefined; updateCustomMetaRange(filter) }" />
                          </div>
                          <div>
                            <Label class="block text-xs text-muted-foreground mb-1">{{ $t('business.filterBar.durationCustomMax') }}</Label>
                            <Input type="number" :model-value="filter.customDurMax?.toString() ?? ''" :placeholder="$t('business.filterBar.sizeMaxPlaceholder')"
                              @update:model-value="(val) => { filter.customDurMax = val ? Number(val) : undefined; updateCustomMetaRange(filter) }" />
                          </div>
                        </div>
                      </div>
                    </RadioGroup>
                  </template>
                </div>
                <div class="p-3 border-t border-border flex justify-end space-x-2">
                  <Button variant="ghost" size="sm" @click="clearFilter(filter); close()">{{ $t('business.filterBar.clear') }}</Button>
                  <Button size="sm" @click="close()">{{ $t('business.filterBar.confirm') }}</Button>
                </div>
              </div>
            </div>
          </template>
        </Dropdown>
      </template>
    </div>

    <div class="h-5 border-l border-border"></div>

    <!-- 排序器 -->
    <div class="flex items-center space-x-3">
      <Dropdown :offset="{ x: 0, y: 8 }" placement="bottom-start">
        <template #trigger="{ isOpen }">
          <Button variant="ghost" size="xs"
            :class="isOpen ? 'text-primary bg-primary/10 rounded-lg' : 'text-muted-foreground hover:text-foreground hover:bg-primary/5 rounded-lg'">
            <span class="material-icons text-sm">sort</span>
            <span class="text-sm">{{ getSortDisplayText() }}</span>
          </Button>
        </template>

        <template #content>
          <div class="min-w-[240px] p-3">
            <h3 class="font-medium text-foreground mb-3">{{ $t('business.filterBar.sortTitle') }}</h3>

            <div class="mb-4">
              <Label class="block text-xs text-muted-foreground mb-2">{{ $t('business.filterBar.sortFieldLabel') }}</Label>
              <RadioGroup :model-value="sortField" class="space-y-2"
                @update:model-value="(val) => updateSort(val as string, sortOrder)">
                <label v-for="option in sortOptions" :key="option.value"
                  class="flex items-center space-x-2 cursor-pointer hover:bg-muted px-2 py-1 rounded">
                  <RadioGroupItem :value="option.value" />
                  <span class="material-icons text-sm text-muted-foreground">{{ option.icon }}</span>
                  <span class="text-sm cursor-pointer">{{ option.label }}</span>
                </label>
              </RadioGroup>
            </div>

            <div class="border-t border-border pt-3 mb-3">
              <Label class="block text-xs text-muted-foreground mb-2">{{ $t('business.filterBar.sortOrderLabel') }}</Label>
              <RadioGroup :model-value="sortOrder" class="space-y-2"
                @update:model-value="(val) => updateSort(sortField, val as string)">
                <label class="flex items-center space-x-2 cursor-pointer hover:bg-muted px-2 py-1 rounded">
                  <RadioGroupItem value="desc" />
                  <span class="material-icons text-sm text-muted-foreground">arrow_downward</span>
                  <span class="text-sm cursor-pointer">{{ $t('business.filterBar.orderDesc') }}</span>
                </label>
                <label class="flex items-center space-x-2 cursor-pointer hover:bg-muted px-2 py-1 rounded">
                  <RadioGroupItem value="asc" />
                  <span class="material-icons text-sm text-muted-foreground">arrow_upward</span>
                  <span class="text-sm cursor-pointer">{{ $t('business.filterBar.orderAsc') }}</span>
                </label>
              </RadioGroup>
            </div>

            <div class="pt-3 border-t border-border flex justify-end">
              <Button variant="ghost" size="sm" @click="resetSort()">{{ $t('business.filterBar.resetDefault') }}</Button>
            </div>
          </div>
        </template>
      </Dropdown>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Dropdown } from '@/renderer/components/common/Dropdown'
import FolderTreeComponent from '@renderer/components/business/FolderTreeComponent/FolderTreeComponent.vue'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Label } from '@/components/ui/label'
import type { FilterRule } from '@/renderer/types/filter'

// 保留 re-export 以兼容历史 import 路径（消费方应优先从 @/renderer/types/filter 引入）
export type { FilterRule }

interface SizePreset {
  id: string
  label: string
  min?: number
  max?: number
}

interface SortOption {
  value: string
  label: string
  icon: string
}

interface CategoryOption {
  value: string
  label: string
  icon: string
}

interface Props {
  filters: FilterRule[]
  isAllSelected: boolean
  folderTreeItems?: any[]
  tagTreeItems?: any[]
  sort?: 'imported_at' | 'id' | 'size' | 'stars' | 'folder_id' | 'tags' | 'name' | 'custom_fields'
  order?: 'asc' | 'desc'
}

interface Emits {
  (e: 'select-all'): void
  (e: 'filter-change', filter: FilterRule): void
  (e: 'filter-clear', filter: FilterRule): void
  (e: 'sort-change', sort: string, order: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n()

const handleSelectAllChange = () => {
  emit('select-all')
}

const sortOptions = computed<SortOption[]>(() => [
  { value: 'imported_at', label: t('business.filterBar.sortFieldImportedAt'), icon: 'schedule' },
  { value: 'id', label: t('business.filterBar.sortFieldId'), icon: 'tag' },
  { value: 'name', label: t('business.filterBar.sortFieldName'), icon: 'sort_by_alpha' },
  { value: 'size', label: t('business.filterBar.sortFieldSize'), icon: 'storage' },
  { value: 'stars', label: t('business.filterBar.sortFieldStars'), icon: 'star' },
  { value: 'folder_id', label: t('business.filterBar.sortFieldFolder'), icon: 'folder' },
  { value: 'tags', label: t('business.filterBar.sortFieldTags'), icon: 'label' },
  { value: 'custom_fields', label: t('business.filterBar.sortFieldCustomFields'), icon: 'settings' },
])

const sortField = ref<string>(props.sort || 'imported_at')
const sortOrder = ref<string>(props.order || 'desc')

watch(() => props.sort, (newSort) => {
  if (newSort) sortField.value = newSort
})

watch(() => props.order, (newOrder) => {
  if (newOrder) sortOrder.value = newOrder
})

const sizePresets = computed<SizePreset[]>(() => [
  { id: 'small', label: t('business.filterBar.sizePresetSmall'), max: 1024 * 1024 },
  { id: 'medium', label: t('business.filterBar.sizePresetMedium'), min: 1024 * 1024, max: 10 * 1024 * 1024 },
  { id: 'large', label: t('business.filterBar.sizePresetLarge'), min: 10 * 1024 * 1024, max: 100 * 1024 * 1024 },
  { id: 'huge', label: t('business.filterBar.sizePresetHuge'), min: 100 * 1024 * 1024 },
])

// metadata 过滤预设：按最长边（px）
const dimensionPresets = computed<SizePreset[]>(() => [
  { id: 'small', label: t('business.filterBar.dimensionPresetSmall'), max: 720 },
  { id: 'medium', label: t('business.filterBar.dimensionPresetMedium'), min: 720, max: 1080 },
  { id: 'large', label: t('business.filterBar.dimensionPresetLarge'), min: 1080, max: 2160 },
  { id: 'huge', label: t('business.filterBar.dimensionPresetHuge'), min: 2160 },
])

// metadata 过滤预设：按时长（秒）
const durationPresets = computed<SizePreset[]>(() => [
  { id: 'short', label: t('business.filterBar.durationPresetShort'), max: 60 },
  { id: 'medium', label: t('business.filterBar.durationPresetMedium'), min: 60, max: 600 },
  { id: 'long', label: t('business.filterBar.durationPresetLong'), min: 600, max: 3600 },
  { id: 'huge', label: t('business.filterBar.durationPresetHuge'), min: 3600 },
])

const categoryOptions = computed<CategoryOption[]>(() => [
  { value: 'video', label: t('business.filterBar.categoryVideo'), icon: 'videocam' },
  { value: 'audio', label: t('business.filterBar.categoryAudio'), icon: 'audiotrack' },
  { value: 'image', label: t('business.filterBar.categoryImage'), icon: 'image' },
])

const getFilterButtonClass = (filter: FilterRule, isOpen: boolean) => {
  const hasActive = hasActiveFilters(filter)

  if (isOpen) return 'text-primary bg-primary/10 rounded-lg'
  if (hasActive) return 'text-primary bg-primary/10 rounded-lg'
  return 'text-muted-foreground hover:text-foreground hover:bg-primary/5 rounded-lg'
}

const hasActiveFilters = (filter: FilterRule) => {
  switch (filter.type) {
    case 'folders':
    case 'tags':
      return filter.selectedValues && filter.selectedValues.length > 0
    case 'urls':
    case 'title':
      return filter.value && filter.value.trim().length > 0
    case 'size':
      return filter.selectedPreset && filter.selectedPreset !== ''
    case 'category':
      return filter.selectedCategory && filter.selectedCategory !== ''
    case 'metadata':
      return !!(filter.metaDimMin || filter.metaDimMax || filter.metaDurMin || filter.metaDurMax)
    default:
      return false
  }
}

const getActiveFilterCount = (filter: FilterRule) => {
  switch (filter.type) {
    case 'folders':
    case 'tags':
      return filter.selectedValues?.length || 0
    case 'urls':
    case 'title':
      return filter.value && filter.value.trim().length > 0 ? 1 : 0
    case 'size':
      return filter.selectedPreset && filter.selectedPreset !== '' ? 1 : 0
    case 'category':
      return filter.selectedCategory && filter.selectedCategory !== '' ? 1 : 0
    case 'metadata':
      return (filter.metaDimMin || filter.metaDimMax || filter.metaDurMin || filter.metaDurMax) ? 1 : 0
    default:
      return 0
  }
}

const updateFilterValues = (filter: FilterRule, values: (string | number)[]) => {
  if (JSON.stringify(filter.selectedValues) === JSON.stringify(values)) return
  filter.selectedValues = values
  filter.active = values.length > 0
  emit('filter-change', filter)
}

const handleTagFilterSelect = (filter: FilterRule, item: any) => {
  const values = [...(filter.selectedValues || [])]
  const id = String(item.id)
  const index = values.indexOf(id)
  if (index >= 0) values.splice(index, 1)
  else values.push(id)
  updateFilterValues(filter, values)
}

const handleFilterInput = (filter: FilterRule, newValue: string) => {
  if (filter.value === newValue) return
  filter.value = newValue
  filter.active = newValue.trim().length > 0
  emit('filter-change', filter)
}

const handleSizePresetChange = (filter: FilterRule, value: string) => {
  if (value === 'custom') {
    filter.selectedPreset = 'custom'
    filter.active = !!(filter.customMin || filter.customMax)
  } else {
    const preset = sizePresets.value.find(p => p.id === value)
    if (preset) {
      filter.selectedPreset = preset.id
      filter.sizeMin = preset.min
      filter.sizeMax = preset.max
      filter.active = true
    }
  }
  emit('filter-change', filter)
}

const updateCustomSizeRange = (filter: FilterRule) => {
  if (filter.selectedPreset === 'custom') {
    filter.sizeMin = filter.customMin
    filter.sizeMax = filter.customMax
    filter.active = !!(filter.customMin || filter.customMax)
    emit('filter-change', filter)
  }
}

const selectCategory = (filter: FilterRule, value: string) => {
  filter.selectedCategory = value
  filter.active = true
  emit('filter-change', filter)
}

// 切换 metadata 子模式（dimension / duration），清空另一模式的范围字段
const handleMetaFieldChange = (filter: FilterRule, mode: 'dimension' | 'duration') => {
  if (filter.metaField === mode) return
  filter.metaField = mode
  // 重置当前模式的预设与范围（保留另一模式的 custom 输入值以便切回）
  filter.selectedMetaPreset = ''
  if (mode === 'dimension') {
    filter.metaDurMin = undefined
    filter.metaDurMax = undefined
  } else {
    filter.metaDimMin = undefined
    filter.metaDimMax = undefined
  }
  filter.active = !!(filter.metaDimMin || filter.metaDimMax || filter.metaDurMin || filter.metaDurMax)
  emit('filter-change', filter)
}

// 选 metadata 预设（沿用 size 预设模式：预设 id 时直接写范围到 meta*Min/Max）
const handleMetaPresetChange = (filter: FilterRule, value: string) => {
  const presets = filter.metaField === 'duration' ? durationPresets.value : dimensionPresets.value
  if (value === 'custom') {
    filter.selectedMetaPreset = 'custom'
    // 切到自定义时以当前 custom 输入值为准
    if (filter.metaField === 'duration') {
      filter.metaDurMin = filter.customDurMin
      filter.metaDurMax = filter.customDurMax
    } else {
      filter.metaDimMin = filter.customDimMin
      filter.metaDimMax = filter.customDimMax
    }
  } else {
    const preset = presets.find(p => p.id === value)
    if (preset) {
      filter.selectedMetaPreset = preset.id
      if (filter.metaField === 'duration') {
        filter.metaDurMin = preset.min
        filter.metaDurMax = preset.max
      } else {
        filter.metaDimMin = preset.min
        filter.metaDimMax = preset.max
      }
    }
  }
  filter.active = !!(filter.metaDimMin || filter.metaDimMax || filter.metaDurMin || filter.metaDurMax)
  emit('filter-change', filter)
}

// 自定义 metadata 范围输入变化
const updateCustomMetaRange = (filter: FilterRule) => {
  if (filter.selectedMetaPreset === 'custom') {
    if (filter.metaField === 'duration') {
      filter.metaDurMin = filter.customDurMin
      filter.metaDurMax = filter.customDurMax
    } else {
      filter.metaDimMin = filter.customDimMin
      filter.metaDimMax = filter.customDimMax
    }
    filter.active = !!(filter.metaDimMin || filter.metaDimMax || filter.metaDurMin || filter.metaDurMax)
    emit('filter-change', filter)
  }
}

const clearFilter = (filter: FilterRule) => {
  filter.selectedValues = []
  filter.value = ''
  filter.selectedPreset = ''
  filter.customMin = undefined
  filter.customMax = undefined
  filter.sizeMin = undefined
  filter.sizeMax = undefined
  filter.selectedCategory = ''
  filter.metaField = 'dimension'
  filter.selectedMetaPreset = ''
  filter.metaDimMin = undefined
  filter.metaDimMax = undefined
  filter.metaDurMin = undefined
  filter.metaDurMax = undefined
  filter.customDimMin = undefined
  filter.customDimMax = undefined
  filter.customDurMin = undefined
  filter.customDurMax = undefined
  filter.active = false
  emit('filter-clear', filter)
}

const getSortDisplayText = () => {
  const option = sortOptions.value.find(opt => opt.value === sortField.value)
  const orderText = sortOrder.value === 'asc' ? '↑' : '↓'
  return option ? `${option.label} ${orderText}` : t('business.filterBar.sortDefault')
}

const updateSort = (field: string, order: string) => {
  sortField.value = field
  sortOrder.value = order
  emit('sort-change', field, order)
}

const resetSort = () => {
  sortField.value = 'imported_at'
  sortOrder.value = 'desc'
  emit('sort-change', 'imported_at', 'desc')
}
</script>
