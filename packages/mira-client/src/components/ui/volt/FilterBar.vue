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
      <!-- 筛选器按钮 -->
      <template v-for="filter in filters" :key="filter.id">
        <Dropdown
          :offset="{ x: 0, y: 8 }"
          placement="bottom-start"
          :close-on-content-click="false"
        >
          <template #trigger="{ isOpen }">
           <button
              :class="[
                'flex items-center space-x-1 px-2 py-1 rounded-md hover:bg-gray-200 transition-colors',
                getFilterButtonClass(filter, isOpen)
              ]"
            >
             <span class="relative">
               <span class="material-icons text-sm">{{ filter.icon }}</span>
               <span v-if="hasActiveFilters(filter)"
                 class="absolute -top-1.5 -right-1.5 bg-blue-500 text-white text-[10px] rounded-full min-w-4 h-4 flex items-center justify-center leading-none px-0.5">
                  {{ getActiveFilterCount(filter) }}
               </span>
             </span>
            </button>
          </template>
          
          <template #content="{ close }">
            <div class="min-w-[280px]">
              <!-- 文件夹筛选器 -->
              <div v-if="filter.type === 'folders'">
                <FilterTree
                  :items="folderTreeItems || []"
                  :multiple="false"
                  :selected-values="filter.selectedValues || []"
                  :show-search="true"
                  :show-actions="false"
                  @update:selected-values="(values) => updateFilterValues(filter, values)"
                />
                <div class="p-3 border-t border-gray-200 flex justify-end space-x-2">
                  <button 
                    class="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                    @click="clearFilter(filter); close()"
                  >
                    清除
                  </button>
                  <button 
                    class="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    @click="close()"
                  >
                    确定
                  </button>
                </div>
              </div>
              
              <!-- 标签筛选器 -->
              <div v-else-if="filter.type === 'tags'">
                <FilterTree
                  :items="tagTreeItems || []"
                  :multiple="true"
                  :selected-values="filter.selectedValues || []"
                  :show-search="true"
                  :show-actions="true"
                  @update:selected-values="(values) => updateFilterValues(filter, values)"
                />
                <div class="p-3 border-t border-gray-200 flex justify-end space-x-2">
                  <button 
                    class="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                    @click="clearFilter(filter); close()"
                  >
                    清除
                  </button>
                  <button 
                    class="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    @click="close()"
                  >
                    确定
                  </button>
                </div>
              </div>
              
              <!-- 网址筛选器 -->
              <div v-else-if="filter.type === 'urls'">
                <div class="p-3">
                  <h3 class="font-medium text-gray-900 mb-3">网址筛选</h3>
                  <input
                    :value="filter.value"
                    type="text"
                    placeholder="输入网址或域名..."
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    @input="updateFilterValue(filter, $event)"
                  />
                </div>
                <div class="p-3 border-t border-gray-200 flex justify-end space-x-2">
                  <button
                    class="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                    @click="clearFilter(filter); close()"
                  >
                    清除
                  </button>
                  <button
                    class="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    @click="close()"
                  >
                    确定
                  </button>
                </div>
              </div>

              <!-- 标题筛选器 -->
              <div v-else-if="filter.type === 'title'">
                <div class="p-3">
                  <h3 class="font-medium text-gray-900 mb-3">标题筛选</h3>
                  <input
                    :value="filter.value"
                    type="text"
                    placeholder="输入标题关键词..."
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    @input="updateFilterValue(filter, $event)"
                  />
                </div>
                <div class="p-3 border-t border-gray-200 flex justify-end space-x-2">
                  <button
                    class="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                    @click="clearFilter(filter); close()"
                  >
                    清除
                  </button>
                  <button
                    class="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    @click="close()"
                  >
                    确定
                  </button>
                </div>
              </div>
              
              <!-- 大小筛选器 -->
              <div v-else-if="filter.type === 'size'">
                <div class="p-3">
                  <h3 class="font-medium text-gray-900 mb-3">文件大小</h3>

                  <!-- 预设大小选项 -->
                  <div class="space-y-2 mb-4">
                    <label
                      v-for="preset in sizePresets"
                      :key="preset.id"
                      class="flex items-center space-x-2 cursor-pointer"
                    >
                      <input
                        type="radio"
                        :value="preset.id"
                        :checked="filter.selectedPreset === preset.id"
                        @change="selectSizePreset(filter, preset)"
                        class="h-4 w-4 text-primary accent-primary"
                      />
                      <span class="text-sm">{{ preset.label }}</span>
                    </label>
                  </div>

                  <!-- 自定义范围 -->
                  <div class="border-t border-gray-200 pt-3">
                    <label class="flex items-center space-x-2 cursor-pointer mb-3">
                      <input
                        type="radio"
                        value="custom"
                        :checked="filter.selectedPreset === 'custom'"
                        @change="filter.selectedPreset = 'custom'"
                        class="h-4 w-4 text-primary accent-primary"
                      />
                      <span class="text-sm">自定义范围</span>
                    </label>

                    <div
                      v-if="filter.selectedPreset === 'custom'"
                      class="grid grid-cols-2 gap-2"
                    >
                      <div>
                        <label class="block text-xs text-gray-600 mb-1">最小值</label>
                        <input
                          v-model="filter.customMin"
                          type="number"
                          placeholder="0"
                          class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          @input="updateCustomSizeRange(filter)"
                        />
                      </div>
                      <div>
                        <label class="block text-xs text-gray-600 mb-1">最大值</label>
                        <input
                          v-model="filter.customMax"
                          type="number"
                          placeholder="无限制"
                          class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          @input="updateCustomSizeRange(filter)"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div class="p-3 border-t border-gray-200 flex justify-end space-x-2">
                  <button
                    class="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                    @click="clearFilter(filter); close()"
                  >
                    清除
                  </button>
                  <button
                    class="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    @click="close()"
                  >
                    确定
                  </button>
                </div>
              </div>

              <!-- 类别筛选器 -->
              <div v-else-if="filter.type === 'category'">
                <div class="p-3">
                  <h3 class="font-medium text-gray-900 mb-3">媒体类别</h3>
                  <div class="space-y-2">
                    <label
                      v-for="category in categoryOptions"
                      :key="category.value"
                      class="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
                    >
                      <input
                        type="radio"
                        :value="category.value"
                        :checked="filter.selectedCategory === category.value"
                        @change="selectCategory(filter, category.value)"
                        class="h-4 w-4 text-primary accent-primary"
                      />
                      <span class="material-icons text-sm text-gray-500">{{ category.icon }}</span>
                      <span class="text-sm">{{ category.label }}</span>
                    </label>
                  </div>
                </div>
                <div class="p-3 border-t border-gray-200 flex justify-end space-x-2">
                  <button
                    class="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                    @click="clearFilter(filter); close()"
                  >
                    清除
                  </button>
                  <button
                    class="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    @click="close()"
                  >
                    确定
                  </button>
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
          <button
            :class="[
              'flex items-center space-x-1 px-2 py-1 rounded-md hover:bg-gray-200 transition-colors',
              isOpen ? 'text-blue-600 bg-blue-50' : 'text-gray-600'
            ]"
          >
            <span class="material-icons text-sm">sort</span>
            <span class="text-sm">{{ getSortDisplayText() }}</span>
            <span class="material-icons text-xs">keyboard_arrow_down</span>
          </button>
        </template>

        <template #content>
          <div class="min-w-[240px] p-3">
            <h3 class="font-medium text-gray-900 mb-3">排序设置</h3>

            <!-- 排序字段 -->
            <div class="mb-4">
              <label class="block text-xs text-gray-600 mb-2">排序字段</label>
              <div class="space-y-2">
                <label
                  v-for="option in sortOptions"
                  :key="option.value"
                  class="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
                >
                  <input
                    type="radio"
                    :value="option.value"
                    :checked="sortField === option.value"
                    @change="updateSort(option.value, sortOrder)"
                    class="h-4 w-4 text-primary accent-primary"
                  />
                  <span class="material-icons text-sm text-gray-500">{{ option.icon }}</span>
                  <span class="text-sm">{{ option.label }}</span>
                </label>
              </div>
            </div>

            <!-- 排序顺序 -->
            <div class="border-t border-gray-200 pt-3 mb-3">
              <label class="block text-xs text-gray-600 mb-2">排序顺序</label>
              <div class="space-y-2">
                <label
                  class="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
                >
                  <input
                    type="radio"
                    value="desc"
                    :checked="sortOrder === 'desc'"
                    @change="updateSort(sortField, 'desc')"
                    class="h-4 w-4 text-primary accent-primary"
                  />
                  <span class="material-icons text-sm text-gray-500">arrow_downward</span>
                  <span class="text-sm">降序</span>
                </label>
                <label
                  class="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
                >
                  <input
                    type="radio"
                    value="asc"
                    :checked="sortOrder === 'asc'"
                    @change="updateSort(sortField, 'asc')"
                    class="h-4 w-4 text-primary accent-primary"
                  />
                  <span class="material-icons text-sm text-gray-500">arrow_upward</span>
                  <span class="text-sm">升序</span>
                </label>
              </div>
            </div>

            <div class="pt-3 border-t border-gray-200 flex justify-end">
              <button
                class="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                @click="resetSort()"
              >
                重置为默认
              </button>
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
import FilterTree from './FilterTree.vue'
import { Checkbox } from '@/components/ui/checkbox'
import type { FilterTreeItem } from './FilterTree.vue'

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
  folderTreeItems?: FilterTreeItem[]
  tagTreeItems?: FilterTreeItem[]
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

// 排序选项
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

// 当前排序状态
const sortField = ref<string>(props.sort || 'imported_at')
const sortOrder = ref<string>(props.order || 'desc')

// 监听 props 变化
watch(() => props.sort, (newSort) => {
  if (newSort) sortField.value = newSort
})

watch(() => props.order, (newOrder) => {
  if (newOrder) sortOrder.value = newOrder
})

// 大小预设选项
const sizePresets: SizePreset[] = [
  { id: 'small', label: '小文件 (< 1MB)', max: 1024 * 1024 },
  { id: 'medium', label: '中等文件 (1MB - 10MB)', min: 1024 * 1024, max: 10 * 1024 * 1024 },
  { id: 'large', label: '大文件 (10MB - 100MB)', min: 10 * 1024 * 1024, max: 100 * 1024 * 1024 },
  { id: 'huge', label: '超大文件 (> 100MB)', min: 100 * 1024 * 1024 },
]

// 类别选项
const categoryOptions: CategoryOption[] = [
  { value: 'video', label: '视频', icon: 'videocam' },
  { value: 'audio', label: '音频', icon: 'audiotrack' },
  { value: 'image', label: '图片', icon: 'image' },
]

// 计算方法
const getFilterButtonClass = (filter: FilterRule, isOpen: boolean) => {
  const hasActive = hasActiveFilters(filter)
  const baseClass = 'text-gray-600'
  
  if (isOpen) {
    return 'text-blue-600 bg-blue-50'
  }
  
  if (hasActive) {
    return 'text-blue-600'
  }
  
  return baseClass
}


const hasActiveFilters = (filter: FilterRule) => {
  switch (filter.type) {
    case 'folders':
    case 'tags':
      return filter.selectedValues && filter.selectedValues.length > 0
    case 'urls':
      return filter.value && filter.value.trim().length > 0
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

// 事件处理方法
const updateFilterValues = (filter: FilterRule, values: (string | number)[]) => {
  // 避免重复触发相同的值
  if (JSON.stringify(filter.selectedValues) === JSON.stringify(values)) {
    return
  }

  filter.selectedValues = values
  filter.active = values.length > 0
  emit('filter-change', filter)
}

const updateFilterValue = (filter: FilterRule, event: Event) => {
  const target = event.target as HTMLInputElement
  const newValue = target.value
  
  // 避免重复触发相同的值
  if (filter.value === newValue) {
    return
  }
  
  filter.value = newValue
  filter.active = newValue.trim().length > 0
  console.log('Updating URL filter value to:', newValue, { filter })
  emit('filter-change', filter)
}

const selectSizePreset = (filter: FilterRule, preset: SizePreset) => {
  // 如果点击的是已经选中的选项，则取消选择
  if (filter.selectedPreset === preset.id) {
    filter.selectedPreset = ''
    filter.sizeMin = undefined
    filter.sizeMax = undefined
    filter.active = false
  } else {
    filter.selectedPreset = preset.id
    filter.sizeMin = preset.min
    filter.sizeMax = preset.max
    filter.active = true
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
  // 如果点击的是已经选中的选项，则取消选择
  if (filter.selectedCategory === value) {
    filter.selectedCategory = ''
    filter.active = false
  } else {
    filter.selectedCategory = value
    filter.active = true
  }
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

// 排序相关方法
const getSortDisplayText = () => {
  const option = sortOptions.find(opt => opt.value === sortField.value)
  const orderText = sortOrder.value === 'asc' ? '↑' : '↓'
  return option ? `${option.label} ${orderText}` : '排序'
}

const updateSort = (field: string, order: string) => {
  console.log('[FilterBar] updateSort called:', { field, order, currentField: sortField.value, currentOrder: sortOrder.value })
  sortField.value = field
  sortOrder.value = order
  console.log('[FilterBar] Emitting sort-change event:', { field, order })
  emit('sort-change', field, order)
  console.log('[FilterBar] sort-change event emitted')
}

const resetSort = () => {
  console.log('[FilterBar] resetSort called')
  sortField.value = 'imported_at'
  sortOrder.value = 'desc'
  console.log('[FilterBar] Emitting sort-change event: imported_at, desc')
  emit('sort-change', 'imported_at', 'desc')
  console.log('[FilterBar] sort-change event emitted after reset')
}
</script>

