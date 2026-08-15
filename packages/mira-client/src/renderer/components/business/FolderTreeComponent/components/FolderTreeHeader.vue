<template>
  <!-- 标题栏 + 搜索 + 多选 + 添加（外层提供统一标题时不渲染） -->
  <div class="flex items-center justify-between px-2 mb-2">
    <h2 class="text-xs font-semibold text-muted-foreground leading-5">{{ title }}</h2>
    <div v-if="!hideActions" class="header-actions flex items-center gap-0.5 -mr-1">
      <button @click="emit('toggle-search')"
        class="header-action-btn flex h-5 w-5 items-center justify-center text-muted-foreground hover:text-muted-foreground rounded"
        :class="{ 'text-primary': showSearch }" :title="t('business.groupedCardBrowserDialog.searchPlaceholder', { type: title })">
        <span class="material-icons leading-none" style="font-size: 18px">search</span>
      </button>
      <button v-if="selectionEnabled" @click="emit('toggle-selection')"
        class="header-action-btn flex h-5 w-5 items-center justify-center text-muted-foreground hover:text-muted-foreground rounded"
        :class="{ 'text-primary': selectionActive }"
        :title="selectionActive ? t('business.folderTreeComponent.exitMultiSelect', { mode: selectionModeLabel, count: selectionCount }) : t('business.folderTreeComponent.multiSelectMode', { mode: selectionModeLabel })">
        <span class="material-icons leading-none" style="font-size: 18px">{{ isMultiMode ? 'checklist' :
          'check_box_outline_blank' }}</span>
      </button>
      <button @click="emit('add')"
        class="header-action-btn flex h-5 w-5 items-center justify-center text-muted-foreground hover:text-muted-foreground rounded"
        :title="t('business.folderTreeComponent.add', { title })">
        <span class="material-icons leading-none" style="font-size: 18px">add</span>
      </button>
    </div>
  </div>

  <!-- 多选工具条 -->
  <div v-if="selectionActive && isMultiMode"
    class="flex items-center justify-between px-2 mb-2 text-xs text-muted-foreground">
    <span>{{ t('business.folderTreeComponent.selectedCount', { count: selectionCount }) }}</span>
    <div class="flex items-center gap-2">
      <button class="text-primary hover:underline" @click="emit('select-all')">{{ t('business.folderTreeComponent.selectAll') }}</button>
      <button class="text-muted-foreground hover:underline" @click="emit('clear-selection')">{{ t('business.folderTreeComponent.clear') }}</button>
    </div>
  </div>

  <!-- 搜索框（展开/折叠动效：grid 0fr→1fr 做高度过渡 + opacity/translateY 叠加） -->
  <Transition name="search-slide">
    <div v-if="showSearch" class="search-shell px-2 mb-2">
      <div class="search-shell-inner">
        <input ref="searchInputRef" :value="searchQuery" type="text"
          :placeholder="t('business.groupedCardBrowserDialog.searchPlaceholder', { type: title })"
          class="w-full px-3 py-1.5 text-xs border border-border rounded-full bg-white/60 dark:bg-muted/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
          @input="onSearchInput" />
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(defineProps<{
  title: string
  hideActions?: boolean
  selectionEnabled?: boolean
  selectionActive?: boolean
  isMultiMode?: boolean
  selectionModeLabel?: string
  selectionCount?: number
  showSearch?: boolean
  searchQuery?: string
}>(), {
  hideActions: false,
  selectionEnabled: false,
  selectionActive: false,
  isMultiMode: false,
  selectionModeLabel: '',
  selectionCount: 0,
  showSearch: false,
  searchQuery: '',
})

const emit = defineEmits<{
  (e: 'toggle-search'): void
  (e: 'toggle-selection'): void
  (e: 'add'): void
  (e: 'select-all'): void
  (e: 'clear-selection'): void
  (e: 'update:searchQuery', value: string): void
}>()

const { t } = useI18n()
const searchInputRef = ref<HTMLInputElement | null>(null)

watch(() => props.showSearch, (val) => {
  if (val) nextTick(() => searchInputRef.value?.focus())
})

function onSearchInput(e: Event) {
  emit('update:searchQuery', (e.target as HTMLInputElement).value)
}
</script>

<style scoped>
.material-icons {
  font-size: 18px;
}

/*
  搜索栏展开/折叠动效。
  - 高度用 grid-template-rows: 0fr → 1fr 过渡（无需 JS 测量，自适应内容高度）。
  - 叠加 opacity + 微量 translateY，进入 ease-out 有 punch、退出更快利索（200ms / 150ms）。
  - 入场起始用 max-height 兜底，避免个别内核 grid 行高过渡不触发。
*/
.search-shell {
  display: grid;
  grid-template-rows: 1fr;
  overflow: hidden;
}

.search-slide-enter-active {
  transition:
    grid-template-rows 200ms cubic-bezier(0.23, 1, 0.32, 1),
    opacity 200ms cubic-bezier(0.23, 1, 0.32, 1),
    transform 200ms cubic-bezier(0.23, 1, 0.32, 1),
    margin 200ms cubic-bezier(0.23, 1, 0.32, 1);
}

.search-slide-leave-active {
  transition:
    grid-template-rows 150ms cubic-bezier(0.4, 0, 1, 1),
    opacity 150ms cubic-bezier(0.4, 0, 1, 1),
    transform 150ms cubic-bezier(0.4, 0, 1, 1),
    margin 150ms cubic-bezier(0.4, 0, 1, 1);
}

.search-slide-enter-from {
  grid-template-rows: 0fr;
  opacity: 0;
  transform: translateY(-4px);
  margin-bottom: -0.5rem;
}

.search-slide-leave-to {
  grid-template-rows: 0fr;
  opacity: 0;
  transform: translateY(-4px);
  margin-bottom: -0.5rem;
}

.search-shell-inner {
  overflow: hidden;
  min-height: 0;
}

/*
  按下反馈（emil-design-eng 硬性项）：可点击元素按压必须即时回弹。
  图标按钮比卡片按钮更克制，用 scale(0.9)。
*/
.header-action-btn {
  transition: transform 160ms ease-out;
}

.header-action-btn:active {
  transform: scale(0.9);
}

@media (prefers-reduced-motion: reduce) {

  .search-slide-enter-active,
  .search-slide-leave-active {
    transition: opacity 150ms ease;
  }

  .search-slide-enter-from,
  .search-slide-leave-to {
    grid-template-rows: 0fr;
    transform: none;
  }

  .header-action-btn {
    transition: none;
  }

}
</style>
