<template>
  <div class="filter-bar flex items-center space-x-4 mb-4 text-gray-500">
    <!-- 全选控制 -->
    <label class="flex items-center space-x-1 cursor-pointer select-none">
      <Checkbox
        :model-value="isAllSelected"
        @update:model-value="handleSelectAllChange"
      />
    </label>

    <div class="h-5 border-l border-gray-300"></div>

    <!-- 筛选器 -->
    <div class="flex items-center space-x-3">
      <template v-for="filter in filters" :key="filter.id">
        <Dropdown
          :offset="{ x: 0, y: 8 }"
          placement="bottom-start"
          :close-on-content-click="false"
        >
          <template #trigger="{ isOpen }">
            <Button
              variant="ghost"
              size="xs"
              :class="getFilterButtonClass(filter, isOpen)"
            >
              <span class="relative">
                <span class="material-icons text-sm">{{ filter.icon }}</span>
                <span v-if="hasActiveFilters(filter)"
                  class="absolute -bottom-0.25 -right-1.5 bg-blue-500 text-white text-[10px] rounded-full min-w-4 h-4 flex items-center justify-center leading-none px-0.5">
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
                  <FolderTreeComponent
                    item-type="folder"
                    :folders="folderTreeItems || []"
                    :selected-key="filter.selectedValues?.[0] != null ? String(filter.selectedValues[0]) : ''"
                    @select="(item: any) => updateFilterValues(filter, item.id ? [item.id] : [])"
                    @refresh="() => {}"
                  />
                </div>
                <div class="p-3 border-t border-gray-200 flex justify-end space-x-2">
                  <Button variant="ghost" size="sm" @click="clearFilter(filter); close()">清除</Button>
                  <Button size="sm" @click="close()">确定</Button>
                </div>
              </div>

              <!-- 标签筛选器 -->
              <div v-else-if="filter.type === 'tags'">
                <div class="max-h-[300px] overflow-y-auto p-2">
                  <FolderTreeComponent
                    item-type="tag"
                    :tags="tagTreeItems || []"
                    @select="(item: any) => handleTagFilterSelect(filter, item)"
                    @refresh="() => {}"
                  />
                </div>
                <div class="p-3 border-t border-gray-200 flex justify-end space-x-2">
                  <Button variant="ghost" size="sm" @click="clearFilter(filter); close()">清除</Button>
                  <Button size="sm" @click="close()">确定</Button>
                </div>
              </div>

              <!-- 网址筛选器 -->
              <div v-else-if="filter.type === 'urls'">
                <div class="p-3">
                  <h3 class="font-medium text-gray-900 mb-3">网址筛选</h3>
                  <Input
                    :model-value="filter.value"
                    placeholder="输入网址或域名..."
                    @update:model-value="(val) => handleFilterInput(filter, val as string)"
                  />
                </div>
                <div class="p-3 border-t border-gray-200 flex justify-end space-x-2">
                  <Button variant="ghost" size="sm" @click="clearFilter(filter); close()">清除</Button>
                  <Button size="sm" @click="close()">确定</Button>
                </div>
              </div>

              <!-- 标题筛选器 -->
              <div v-else-if="filter.type === 'title'">
                <div class="p-3">
                  <h3 class="font-medium text-gray-900 mb-3">标题筛选</h3>
                  <Input
                    :model-value="filter.value"
                    placeholder="输入标题关键词..."
                    @update:model-value="(val) => handleFilterInput(filter, val as string)"
                  />
                </div>
                <div class="p-3 border-t border-gray-200 flex justify-end space-x-2">
                  <Button variant="ghost" size="sm" @click="clearFilter(filter); close()">清除</Button>
                  <Button size="sm" @click="close()">确定</Button>
                </div>
              </div>

              <!-- 大小筛选器 -->
              <div v-else-if="filter.type === 'size'">
                <div class="p-3">
                  <h3 class="font-medium text-gray-900 mb-3">文件大小</h3>

                  <RadioGroup
                    :model-value="filter.selectedPreset || ''"
                    class="space-y-2 mb-4"
                    @update:model-value="(val) => handleSizePresetChange(filter, val as string)"
                  >
                    <div
                      v-for="preset in sizePresets"
                      :key="preset.id"
                      class="flex items-center space-x-2 cursor-pointer"
                    >
                      <RadioGroupItem :value="preset.id" />
                      <Label class="text-sm cursor-pointer">{{ preset.label }}</Label>
                    </div>

                    <div class="border-t border-gray-200 pt-3">
                      <div class="flex items-center space-x-2 cursor-pointer mb-3">
                        <RadioGroupItem value="custom" />
                        <Label class="text-sm cursor-pointer">自定义范围</Label>
                      </div>

                      <div v-if="filter.selectedPreset === 'custom'" class="grid grid-cols-2 gap-2">
                        <div>
                          <Label class="block text-xs text-gray-600 mb-1">最小值</Label>
                          <Input
                            type="number"
                            :model-value="filter.customMin?.toString() ?? ''"
                            placeholder="0"
                            @update:model-value="(val) => { filter.customMin = val ? Number(val) : undefined; updateCustomSizeRange(filter) }"
                          />
                        </div>
                        <div>
                          <Label class="block text-xs text-gray-600 mb-1">最大值</Label>
                          <Input
                            type="number"
                            :model-value="filter.customMax?.toString() ?? ''"
                            placeholder="无限制"
                            @update:model-value="(val) => { filter.customMax = val ? Number(val) : undefined; updateCustomSizeRange(filter) }"
                          />
                        </div>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
                <div class="p-3 border-t border-gray-200 flex justify-end space-x-2">
                  <Button variant="ghost" size="sm" @click="clearFilter(filter); close()">清除</Button>
                  <Button size="sm" @click="close()">确定</Button>
                </div>
              </div>

              <!-- 类别筛选器 -->
              <div v-else-if="filter.type === 'category'">
                <div class="p-3">
                  <h3 class="font-medium text-gray-900 mb-3">媒体类别</h3>
                  <RadioGroup
                    :model-value="filter.selectedCategory || ''"
                    class="space-y-2"
                    @update:model-value="(val) => selectCategory(filter, val as string)"
                  >
                    <div
                      v-for="category in categoryOptions"
                      :key="category.value"
                      class="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
                    >
                      <RadioGroupItem :value="category.value" />
                      <span class="material-icons text-sm text-gray-500">{{ category.icon }}</span>
                      <Label class="text-sm cursor-pointer">{{ category.label }}</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div class="p-3 border-t border-gray-200 flex justify-end space-x-2">
                  <Button variant="ghost" size="sm" @click="clearFilter(filter); close()">清除</Button>
                  <Button size="sm" @click="close()">确定</Button>
                </div>
              </div>
            </div>
          </template>
        </Dropdown>
      </template>
    </div>

    <div class="h-5 border-l border-gray-300"></div>

    <!-- 排序器 -->
    <div class="flex items-center space-x-3">
      <Dropdown
        :offset="{ x: 0, y: 8 }"
        placement="bottom-start"
      >
        <template #trigger="{ isOpen }">
          <Button
            variant="ghost"
            size="xs"
            :class="isOpen ? 'text-blue-600 bg-blue-50' : 'text-gray-600'"
          >
            <span class="material-icons text-sm">sort</span>
            <span class="text-sm">{{ getSortDisplayText() }}</span>
            <span class="material-icons text-xs">keyboard_arrow_down</span>
          </Button>
        </template>

        <template #content>
          <div class="min-w-[240px] p-3">
            <h3 class="font-medium text-gray-900 mb-3">排序设置</h3>

            <div class="mb-4">
              <Label class="block text-xs text-gray-600 mb-2">排序字段</Label>
              <RadioGroup
                :model-value="sortField"
                class="space-y-2"
                @update:model-value="(val) => updateSort(val as string, sortOrder)"
              >
                <div
                  v-for="option in sortOptions"
                  :key="option.value"
                  class="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
                >
                  <RadioGroupItem :value="option.value" />
                  <span class="material-icons text-sm text-gray-500">{{ option.icon }}</span>
                  <Label class="text-sm cursor-pointer">{{ option.label }}</Label>
                </div>
              </RadioGroup>
            </div>

            <div class="border-t border-gray-200 pt-3 mb-3">
              <Label class="block text-xs text-gray-600 mb-2">排序顺序</Label>
              <RadioGroup
                :model-value="sortOrder"
                class="space-y-2"
                @update:model-value="(val) => updateSort(sortField, val as string)"
              >
                <div class="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded">
                  <RadioGroupItem value="desc" />
                  <span class="material-icons text-sm text-gray-500">arrow_downward</span>
                  <Label class="text-sm cursor-pointer">降序</Label>
                </div>
                <div class="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded">
                  <RadioGroupItem value="asc" />
                  <span class="material-icons text-sm text-gray-500">arrow_upward</span>
                  <Label class="text-sm cursor-pointer">升序</Label>
                </div>
              </RadioGroup>
            </div>

            <div class="pt-3 border-t border-gray-200 flex justify-end">
              <Button variant="ghost" size="sm" @click="resetSort()">重置为默认</Button>
            </div>
          </div>
        </template>
      </Dropdown>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import Dropdown from './Dropdown.vue'
import FolderTreeComponent from '@renderer/components/business/FolderTreeComponent/FolderTreeComponent.vue'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'

export interface FilterRule {
  id: string
  type: 'folders' | 'tags' | 'urls' | 'title' | 'size' | 'category'
  label: string
  icon: string
  active?: boolean
  selectedValues?: (string | number)[]
  value?: string
  selectedPreset?: string
  customMin?: number
  customMax?: number
  selectedCategory?: string
  [key: string]: any
}

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

const handleSelectAllChange = () => {
  emit('select-all')
}

const sortOptions: SortOption[] = [
  { value: 'imported_at', label: '导入时间', icon: 'schedule' },
  { value: 'id', label: 'ID', icon: 'tag' },
  { value: 'name', label: '名称', icon: 'sort_by_alpha' },
  { value: 'size', label: '文件大小', icon: 'storage' },
  { value: 'stars', label: '星标', icon: 'star' },
  { value: 'folder_id', label: '文件夹', icon: 'folder' },
  { value: 'tags', label: '标签', icon: 'label' },
  { value: 'custom_fields', label: '自定义字段', icon: 'settings' },
]

const sortField = ref<string>(props.sort || 'imported_at')
const sortOrder = ref<string>(props.order || 'desc')

watch(() => props.sort, (newSort) => {
  if (newSort) sortField.value = newSort
})

watch(() => props.order, (newOrder) => {
  if (newOrder) sortOrder.value = newOrder
})

const sizePresets: SizePreset[] = [
  { id: 'small', label: '小文件 (< 1MB)', max: 1024 * 1024 },
  { id: 'medium', label: '中等文件 (1MB - 10MB)', min: 1024 * 1024, max: 10 * 1024 * 1024 },
  { id: 'large', label: '大文件 (10MB - 100MB)', min: 10 * 1024 * 1024, max: 100 * 1024 * 1024 },
  { id: 'huge', label: '超大文件 (> 100MB)', min: 100 * 1024 * 1024 },
]

const categoryOptions: CategoryOption[] = [
  { value: 'video', label: '视频', icon: 'videocam' },
  { value: 'audio', label: '音频', icon: 'audiotrack' },
  { value: 'image', label: '图片', icon: 'image' },
]

const getFilterButtonClass = (filter: FilterRule, isOpen: boolean) => {
  const hasActive = hasActiveFilters(filter)

  if (isOpen) return 'text-blue-600 bg-blue-50'
  if (hasActive) return 'text-blue-600'
  return 'text-gray-600'
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
    const preset = sizePresets.find(p => p.id === value)
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

const clearFilter = (filter: FilterRule) => {
  filter.selectedValues = []
  filter.value = ''
  filter.selectedPreset = ''
  filter.customMin = undefined
  filter.customMax = undefined
  filter.sizeMin = undefined
  filter.sizeMax = undefined
  filter.selectedCategory = ''
  filter.active = false
  emit('filter-clear', filter)
}

const getSortDisplayText = () => {
  const option = sortOptions.find(opt => opt.value === sortField.value)
  const orderText = sortOrder.value === 'asc' ? '↑' : '↓'
  return option ? `${option.label} ${orderText}` : '排序'
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
