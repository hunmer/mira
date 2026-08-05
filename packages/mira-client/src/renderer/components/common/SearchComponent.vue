<template>
  <div class="search-component relative">
    <!-- 主搜索框 -->
    <div class="relative flex items-center">
      <!-- 搜索输入框 -->
      <div class="relative flex-1">
        <Input
          :model-value="modelValue"
          :placeholder="placeholder"
          :disabled="disabled"
          class="w-full pl-10 pr-12 py-2 text-sm border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          @input="handleInput"
          @keydown.enter="handleSearch"
          @focus="showSuggestions = true"
        />
        <span class="material-icons absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">search</span>
      </div>
      
      <!-- 加载指示器 -->
      <div v-if="loading" class="absolute right-3 top-1/2 transform -translate-y-1/2">
        <Progress class="h-4 w-4" />
      </div>
      
      <!-- 过滤器按钮 -->
      <Button
        v-if="showFilter"
        :variant="hasActiveFilters ? 'default' : 'ghost'"
        class="rounded-full ml-2"
        @click="toggleFilterPanel"
      >
        <span class="material-icons">filter_list</span>
      </Button>
      
      <!-- 清除按钮 -->
      <Button
        v-if="modelValue"
        variant="ghost"
        size="sm"
        class="rounded-full absolute right-12 top-1/2 transform -translate-y-1/2"
        @click="handleClear"
      >
        <span class="material-icons">close</span>
      </Button>
    </div>
    
    <!-- 搜索建议/历史 -->
    <div
      v-if="showSuggestions && (searchHistory.length > 0 || suggestions.length > 0)"
      class="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto"
    >
      <!-- 搜索历史 -->
      <div v-if="searchHistory.length > 0 && !modelValue">
        <div class="px-3 py-2 text-xs font-semibold text-muted-foreground border-b border-border">
          最近搜索
        </div>
        <div
          v-for="(item, index) in searchHistory.slice(0, 5)"
          :key="`history-${index}`"
          class="flex items-center px-3 py-2 hover:bg-muted cursor-pointer group"
          @click="selectSuggestion(item)"
        >
          <span class="material-icons text-muted-foreground mr-3">history</span>
          <span class="flex-1 text-sm">{{ item }}</span>
          <Button
            variant="ghost"
            size="sm"
            class="rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            @click.stop="removeFromHistory(item)"
          >
            <span class="material-icons">close</span>
          </Button>
        </div>
      </div>
      
      <!-- 搜索建议 -->
      <div v-if="suggestions.length > 0">
        <div class="px-3 py-2 text-xs font-semibold text-muted-foreground border-b border-border">
          建议
        </div>
        <div
          v-for="(suggestion, index) in suggestions"
          :key="`suggestion-${index}`"
          class="flex items-center px-3 py-2 hover:bg-muted cursor-pointer"
          @click="selectSuggestion(suggestion)"
        >
          <span class="material-icons text-muted-foreground mr-3">search</span>
          <span class="text-sm">{{ suggestion }}</span>
        </div>
      </div>
    </div>
    
    <!-- 高级过滤器面板 -->
    <div
      v-if="showFilterPanel"
      class="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-lg z-50 p-4"
    >
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold text-foreground">高级筛选</h3>
        <Button
          variant="ghost"
          size="sm"
          class="rounded-full"
          @click="showFilterPanel = false"
        >
          <span class="material-icons">close</span>
        </Button>
      </div>
      
      <div class="space-y-3">
        <div v-for="filter in availableFilters" :key="`filter-${filter.key}`" class="flex items-center space-x-3">
          <label class="text-sm font-medium text-muted-foreground w-20">{{ filter.label }}</label>
          
          <!-- 文本输入 -->
          <Input
            v-if="filter.type === 'text'"
            :model-value="String(activeFilters[filter.key] || '')"
            class="flex-1 h-8 text-xs"
            @update:model-value="(value: string | undefined) => { if (value !== undefined) activeFilters[filter.key] = value }"
          />
          
          <!-- 选择器 -->
          <Select
            v-else-if="filter.type === 'select'"
            :model-value="activeFilters[filter.key]"
            @update:model-value="(value: any) => activeFilters[filter.key] = value"
          >
            <SelectTrigger class="flex-1 h-8">
              <SelectValue placeholder="请选择" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="opt in filter.options" :key="opt.value" :value="opt.value">{{ opt.label }}</SelectItem>
            </SelectContent>
          </Select>
          
          <!-- 日期选择器 -->
          <DatePicker
            v-else-if="filter.type === 'date'"
            :model-value="activeFilters[filter.key]"
            show-icon
            class="flex-1"
            size="small"
            @update:model-value="(value: any) => activeFilters[filter.key] = value"
          />
        </div>
      </div>
      
      <div class="flex items-center justify-end space-x-2 mt-4 pt-3 border-t border-border">
        <Button
          variant="outline"
          size="sm"
          @click="resetFilters"
        >
          重置
        </Button>
        <Button
          size="sm"
          @click="applyFilters"
        >
          应用
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { Progress } from '@/components/ui/progress'
import type { SearchComponentProps, SearchFilter, SearchEvents } from '../../types/components'
import ConfigStorage from '@renderer/utils/ConfigStorage'

interface Props extends SearchComponentProps {
  availableFilters?: SearchFilter[]
  suggestions?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '搜索...',
  showFilter: true,
  showHistory: true,
  disabled: false,
  loading: false,
  availableFilters: () => [],
  suggestions: () => []
})

const emit = defineEmits<SearchEvents>()

// 响应式数据
const showSuggestions = ref(false)
const showFilterPanel = ref(false)
const searchHistory = ref<string[]>([])
const activeFilters = ref<Record<string, any>>({})

// 计算属性
const hasActiveFilters = computed(() => {
  return Object.values(activeFilters.value).some(value => 
    value !== null && value !== undefined && value !== ''
  )
})

// 方法
const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const value = target.value || ''
  emit('update:modelValue', value)
}

const handleSearch = () => {
  if (props.modelValue) {
    addToHistory(props.modelValue)
    emit('search', props.modelValue, getActiveFilters())
    showSuggestions.value = false
  }
}

const handleClear = () => {
  emit('update:modelValue', '')
  emit('clear')
  showSuggestions.value = false
}

const selectSuggestion = (suggestion: string) => {
  emit('update:modelValue', suggestion)
  addToHistory(suggestion)
  emit('search', suggestion, getActiveFilters())
  showSuggestions.value = false
}

const addToHistory = (query: string) => {
  if (props.showHistory && query.trim()) {
    const history = searchHistory.value.filter(item => item !== query)
    history.unshift(query)
    searchHistory.value = history.slice(0, 10) // 最多保存10条
    ConfigStorage.setItem('mira-search-history', JSON.stringify(searchHistory.value))
  }
}

const removeFromHistory = (query: string) => {
  searchHistory.value = searchHistory.value.filter(item => item !== query)
  ConfigStorage.setItem('mira-search-history', JSON.stringify(searchHistory.value))
}

const toggleFilterPanel = () => {
  showFilterPanel.value = !showFilterPanel.value
}

const resetFilters = () => {
  Object.keys(activeFilters.value).forEach(key => {
    delete activeFilters.value[key]
  })
  emit('filter', [])
}

const applyFilters = () => {
  emit('filter', getActiveFilters())
  showFilterPanel.value = false
}

const getActiveFilters = (): SearchFilter[] => {
  if (!props.availableFilters || !Array.isArray(props.availableFilters)) {
    return []
  }
  
  return props.availableFilters.filter(filter => {
    if (!filter || typeof filter.key !== 'string') {
      return false
    }
    const value = activeFilters.value[filter.key]
    return value !== null && value !== undefined && value !== ''
  }).map(filter => ({
    ...filter,
    value: activeFilters.value[filter.key]
  }))
}

// 点击外部关闭建议和过滤器面板
const handleClickOutside = (event: Event) => {
  const target = event.target as HTMLElement
  if (!target.closest('.search-component')) {
    showSuggestions.value = false
    showFilterPanel.value = false
  }
}

// 生命周期
onMounted(() => {
  // 加载搜索历史
  if (props.showHistory) {
    try {
      const history = ConfigStorage.getItem('mira-search-history')
      if (history) {
        searchHistory.value = JSON.parse(history)
      }
    } catch (error) {
      console.warn('Failed to load search history:', error)
    }
  }
  
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// 监听模型值变化
watch(() => props.modelValue, (newValue) => {
  if (!newValue) {
    showSuggestions.value = false
  }
})
</script>
