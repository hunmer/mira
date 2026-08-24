<template>
  <div class="global-search-content bg-muted dark:bg-[#1f2937] text-muted-foreground rounded-lg shadow-lg w-full max-w-2xl mx-auto">
    <!-- 搜索头部 -->
    <div class="search-header p-4 border-b border-border flex items-center justify-between">
      <div class="flex items-center w-full">
        <span class="material-icons text-muted-foreground">search</span>
        <input 
          ref="searchInputRef"
          v-model="searchKeyword"
          class="bg-transparent text-muted-foreground placeholder-gray-500 ml-2 w-full focus:outline-none"
          :placeholder="t('search.globalSearch.placeholder')"
          type="text"
          @keydown="handleSearchInputKeydown"
          @input="handleSearchInput"
        />
      </div>
      <button 
        class="text-muted-foreground hover:text-muted-foreground transition-colors"
        @click="handleClose"
      >
        <span class="material-icons">close</span>
      </button>
    </div>

    <!-- Tab切换区域 -->
    <div class="search-tabs p-4 flex space-x-4">
      <button
        v-for="service in availableServices"
        :key="service.id"
        :class="[
          'relative px-4 py-2 rounded-md transition-all duration-200',
          globalSearchState.activeTab === service.id 
            ? 'bg-muted text-white' 
            : 'bg-muted hover:bg-muted text-muted-foreground'
        ]"
        @click="setActiveTab(service.id)"
      >
        <span class="material-icons text-sm mr-1">{{ service.icon }}</span>
        {{ resolveServiceText(service.title) }}
        
        <!-- 数量徽章 -->
        <span 
          v-if="getTotalCount(service.id) > 0"
          class="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-xs text-white"
        >
          {{ getTotalCount(service.id) }}
        </span>
      </button>
    </div>

    <!-- 搜索结果区域 -->
    <div class="search-results px-4 pb-4">
      <div class="bg-muted p-2 rounded-lg">
        <!-- 加载状态 -->
        <div v-if="globalSearchState.isSearching" class="flex items-center justify-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span class="ml-2 text-muted-foreground">{{ t('search.globalSearch.searching') }}</span>
        </div>

        <!-- 搜索结果列表 -->
        <ul 
          v-else-if="currentSearchResults.length > 0" 
          class="space-y-1 max-h-80 overflow-y-auto"
          role="listbox"
          :aria-label="t('search.globalSearch.searchResultsAria', { title: resolveServiceText(currentService?.title) })"
        >
          <li
            v-for="(item, index) in currentSearchResults"
            :key="getItemKey(item, index)"
            :class="[
              'search-result-item p-2 rounded-md cursor-pointer transition-all duration-200 ease-in-out',
              selectedResultIndex === index 
                ? 'bg-muted ring-2 ring-primary' 
                : 'hover:bg-muted'
            ]"
            role="option"
            :aria-selected="selectedResultIndex === index"
            @click="handleItemClick(currentService?.id || '', item)"
            @mouseenter="selectedResultIndex = index"
          >
            <!-- 动态渲染搜索结果 -->
            <component 
              :is="getResultTemplate()"
              :item="item"
            />
          </li>
        </ul>

        <!-- 空状态 -->
        <EmptySearchState 
          v-else-if="searchKeyword.trim()"
          :keyword="searchKeyword"
          :service-title="resolveServiceText(currentService?.title) || ''"
          @search="handleSuggestionSearch"
        />

        <!-- 初始状态 -->
        <div v-else class="empty-initial-state text-center py-12">
          <span class="material-icons text-6xl text-muted-foreground mb-4">search</span>
          <p class="text-muted-foreground text-lg mb-2">{{ t('search.globalSearch.startSearch') }}</p>
          <p class="text-muted-foreground text-sm">
            {{ t('search.globalSearch.searchHint', { service: resolveServiceText(currentService?.title) || t('search.globalSearch.defaultContent') }) }}
          </p>
        </div>
      </div>
    </div>

    <!-- 键盘快捷键提示 -->
    <div class="search-footer p-4 border-t border-border flex justify-between items-center text-sm text-muted-foreground">
      <div class="flex items-center space-x-4">
        <div class="flex items-center space-x-1">
          <span>{{ t('search.globalSearch.switchTab') }}</span>
          <kbd class="bg-muted px-2 py-1 rounded-md">Tab</kbd>
        </div>
        <div class="flex items-center space-x-1">
          <span>{{ t('search.globalSearch.navigate') }}</span>
          <kbd class="bg-muted px-2 py-1 rounded-md">↑</kbd>
          <kbd class="bg-muted px-2 py-1 rounded-md">↓</kbd>
        </div>
        <div class="flex items-center space-x-1">
          <span>{{ t('search.globalSearch.select') }}</span>
          <kbd class="bg-muted px-2 py-1 rounded-md">↵</kbd>
        </div>
      </div>
      <div class="flex items-center space-x-1">
        <span>{{ t('search.globalSearch.close') }}</span>
        <kbd class="bg-muted px-2 py-1 rounded-md">ESC</kbd>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, defineAsyncComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGlobalSearch } from '../../composables/useGlobalSearch'
import EmptySearchState from './EmptySearchState.vue'

const { t, te } = useI18n()

/**
 * 解析搜索服务的 title/desc。
 * 搜索服务文件中的值现在是 i18n key（如 'services.searchServices.files.title'），
 * 需要用 t() 翻译；其它情况（如插件注册的纯文本）原样返回。
 */
const resolveServiceText = (value: string | undefined): string => {
  if (!value) return ''
  if (value.startsWith('services.') && te(value)) {
    return t(value)
  }
  return value
}

// 动态导入搜索结果模板组件
const FileSearchResultTemplate = defineAsyncComponent(() => import('./FileSearchResultTemplate.vue'))
const TagSearchResultTemplate = defineAsyncComponent(() => import('./TagSearchResultTemplate.vue'))
const FolderSearchResultTemplate = defineAsyncComponent(() => import('./FolderSearchResultTemplate.vue'))

// 使用全局搜索状态和方法
const {
  state: globalSearchState,
  availableServices,
  currentSearchResults,
  currentService,
  setSearchKeyword,
  setActiveTab,
  handleItemClick,
  hideSearchDialog
} = useGlobalSearch()

// 局部状态
const searchInputRef = ref<HTMLInputElement>()
const selectedResultIndex = ref(-1)
const searchKeyword = ref('')

/**
 * 获取搜索结果项的唯一key
 */
const getItemKey = (item: any, index: number): string => {
  return item.id ? `${currentService.value?.id}-${item.id}` : `item-${index}`
}

/**
 * 获取服务的总数量
 */
const getTotalCount = (serviceId: string): number => {
  return globalSearchState.value.totalCounts[serviceId] || 0
}

/**
 * 获取当前服务的结果模板组件
 */
const getResultTemplate = () => {
  if (!currentService.value) return 'div'
  
  switch (currentService.value.id) {
    case 'files':
      return FileSearchResultTemplate
    case 'tags':
      return TagSearchResultTemplate
    case 'folders':
      return FolderSearchResultTemplate
    default:
      return 'div'
  }
}

/**
 * 处理搜索输入
 */
const handleSearchInput = (): void => {
  setSearchKeyword(searchKeyword.value)
  selectedResultIndex.value = -1 // 重置选中索引
}

/**
 * 处理搜索输入框键盘事件
 */
const handleSearchInputKeydown = (event: KeyboardEvent): void => {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      if (currentSearchResults.value.length > 0) {
        selectedResultIndex.value = Math.min(
          selectedResultIndex.value + 1, 
          currentSearchResults.value.length - 1
        )
      }
      break
    case 'ArrowUp':
      event.preventDefault()
      if (currentSearchResults.value.length > 0) {
        selectedResultIndex.value = Math.max(selectedResultIndex.value - 1, 0)
      }
      break
    case 'Enter':
      event.preventDefault()
      if (selectedResultIndex.value >= 0 && currentSearchResults.value[selectedResultIndex.value]) {
        const selectedItem = currentSearchResults.value[selectedResultIndex.value]
        handleItemClick(currentService.value?.id || '', selectedItem)
      }
      break
    case 'Escape':
      event.preventDefault()
      handleClose()
      break
    case 'Tab': {
      event.preventDefault()
      // Tab键切换到下一个服务
      const serviceIds = availableServices.value.map(s => s.id)
      const currentIndex = serviceIds.indexOf(globalSearchState.value.activeTab)
      const nextIndex = (currentIndex + 1) % serviceIds.length
      setActiveTab(serviceIds[nextIndex])
      break
    }
  }
}

/**
 * 处理关闭事件
 */
const handleClose = (): void => {
  hideSearchDialog()
}

/**
 * 处理建议搜索
 */
const handleSuggestionSearch = (suggestion: string): void => {
  searchKeyword.value = suggestion
  setSearchKeyword(suggestion)
  selectedResultIndex.value = -1
}

/**
 * 聚焦搜索输入框
 */
const focusSearchInput = (): void => {
  nextTick(() => {
    if (searchInputRef.value) {
      searchInputRef.value.focus()
    }
  })
}

// 生命周期
onMounted(() => {
  focusSearchInput()
})

// 暴露方法给父组件
defineExpose({
  focusSearchInput
})
</script>

<style scoped>
/* 选中状态的特殊样式 */
.search-result-item[aria-selected="true"] {
  transform: translateX(2px);
}

/* 滚动条样式 */
.search-results ul::-webkit-scrollbar {
  width: 6px;
}

.search-results ul::-webkit-scrollbar-track {
  background: #374151;
  border-radius: 3px;
}

.search-results ul::-webkit-scrollbar-thumb {
  background: #6B7280;
  border-radius: 3px;
}

.search-results ul::-webkit-scrollbar-thumb:hover {
  background: #9CA3AF;
}

/* 键盘快捷键样式 */
kbd {
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1;
}

/* 响应式设计 */
@media (max-width: 640px) {
  .global-search-content {
    max-width: 100%;
    margin: 0;
    border-radius: 0;
  }

  .search-tabs {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .search-tabs button {
    font-size: 0.875rem;
    padding: 0.5rem 0.75rem;
  }

  .search-footer {
    flex-direction: column;
    gap: 0.5rem;
    text-align: center;
  }
}
</style>
